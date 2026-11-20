using System.Net;
using System.Net.Sockets;
using System.Text;

namespace SavedSpace.Core;

public sealed record FetchResult(Uri FinalUri, string? ContentType, string Body, bool Truncated);

public sealed class UnsafeUrlException(string message) : Exception(message);

/// <summary>
/// Downloads a small amount of text from a public web address, and nothing else.
/// Protections: http/https only, DNS is resolved and every address checked (all must be public),
/// the connection goes to the checked address (so DNS tricks cannot swap it), max 3 redirects each checked again,
/// 5 second timeout, response size cap, text content types only. Nothing is stored and no video is downloaded.
/// </summary>
public sealed class SafeFetcher : IDisposable
{
    public const int MaxRedirects = 3;
    public static readonly TimeSpan Timeout = TimeSpan.FromSeconds(5);

    private readonly HttpClient _http;
    private readonly Func<string, CancellationToken, Task<IPAddress[]>> _resolve;

    public SafeFetcher(Func<string, CancellationToken, Task<IPAddress[]>>? resolver = null, HttpMessageHandler? handler = null)
    {
        _resolve = resolver ?? ((host, ct) => Dns.GetHostAddressesAsync(host, ct));
        handler ??= new SocketsHttpHandler
        {
            AllowAutoRedirect = false,
            AutomaticDecompression = DecompressionMethods.All,
            ConnectTimeout = Timeout,
            UseCookies = false,
            UseProxy = false,
            // Connect to the address we checked, never to whatever DNS says a moment later.
            ConnectCallback = async (ctx, ct) =>
            {
                var ips = await SafeAddressesAsync(ctx.DnsEndPoint.Host, ct);
                var socket = new Socket(SocketType.Stream, ProtocolType.Tcp) { NoDelay = true };
                try
                {
                    await socket.ConnectAsync(new IPEndPoint(ips[0], ctx.DnsEndPoint.Port), ct);
                    return new NetworkStream(socket, ownsSocket: true);
                }
                catch { socket.Dispose(); throw; }
            },
        };
        _http = new HttpClient(handler, disposeHandler: true) { Timeout = Timeout };
    }

    /// <summary>Resolves a host and requires EVERY address to be public. Throws UnsafeUrlException otherwise.</summary>
    public async Task<IPAddress[]> SafeAddressesAsync(string host, CancellationToken ct)
    {
        host = host.Trim('[', ']');
        IPAddress[] ips = IPAddress.TryParse(host, out var literal) ? [literal] : await _resolve(host, ct);
        if (ips.Length == 0) throw new UnsafeUrlException("That address could not be found.");
        if (ips.Any(SsrfGuard.IsBlockedAddress)) throw new UnsafeUrlException("That link points to a private address.");
        return ips;
    }

    public async Task<FetchResult> FetchAsync(Uri uri, int maxBytes, CancellationToken ct)
    {
        for (var hop = 0; ; hop++)
        {
            if (!SsrfGuard.TryValidateUrl(uri.AbsoluteUri, out var checkedUri, out var error)) throw new UnsafeUrlException(error!);
            uri = checkedUri!;
            await SafeAddressesAsync(uri.DnsSafeHost, ct);

            using var request = new HttpRequestMessage(HttpMethod.Get, uri);
            request.Headers.TryAddWithoutValidation("User-Agent", "Mozilla/5.0 (compatible; SavedSpacePreview/1.0)");
            request.Headers.TryAddWithoutValidation("Accept", "text/html,application/json;q=0.9,text/plain;q=0.5");
            request.Headers.TryAddWithoutValidation("Accept-Language", "en");

            using var response = await _http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);

            if ((int)response.StatusCode is >= 300 and < 400 && response.Headers.Location is { } location)
            {
                if (hop >= MaxRedirects) throw new UnsafeUrlException("Too many redirects.");
                uri = location.IsAbsoluteUri ? location : new Uri(uri, location);
                continue;
            }

            response.EnsureSuccessStatusCode();
            var type = response.Content.Headers.ContentType?.MediaType;
            if (type == null || !(type.StartsWith("text/", StringComparison.OrdinalIgnoreCase)
                || type.Equals("application/json", StringComparison.OrdinalIgnoreCase)
                || type.Equals("application/xhtml+xml", StringComparison.OrdinalIgnoreCase)))
                throw new UnsafeUrlException("That link is not a web page.");

            await using var stream = await response.Content.ReadAsStreamAsync(ct);
            var buffer = new byte[Math.Min(maxBytes, 16 * 1024)];
            using var ms = new MemoryStream();
            var truncated = false;
            int read;
            while ((read = await stream.ReadAsync(buffer, ct)) > 0)
            {
                var room = maxBytes - (int)ms.Length;
                if (read >= room) { ms.Write(buffer, 0, room); truncated = true; break; }
                ms.Write(buffer, 0, read);
            }

            Encoding encoding = Encoding.UTF8;
            try { if (response.Content.Headers.ContentType?.CharSet is { } cs) encoding = Encoding.GetEncoding(cs.Trim('"')); } catch { }
            return new FetchResult(uri, type, encoding.GetString(ms.ToArray()), truncated);
        }
    }

    public void Dispose() => _http.Dispose();
}
