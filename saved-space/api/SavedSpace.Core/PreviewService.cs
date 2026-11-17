using System.Text.Json;

namespace SavedSpace.Core;

public sealed record PreviewResult(string Kind, string Url, string? Title, string? ThumbnailUrl, string? Provider);

/// <summary>Builds the preview (title + picture) for a link. Never throws for a normal network problem: returns what it knows.</summary>
public sealed class PreviewService(SafeFetcher fetcher)
{
    public const int MaxPageBytes = 512 * 1024;
    public const int MaxJsonBytes = 64 * 1024;

    public async Task<PreviewResult> GetAsync(Uri uri, CancellationToken ct)
    {
        var info = LinkClassifier.Classify(uri);
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(SafeFetcher.Timeout);

        try
        {
            return info.Kind == "youtube"
                ? await YoutubeAsync(info, timeout.Token)
                : await PageAsync(uri, info, timeout.Token);
        }
        catch (UnsafeUrlException) { throw; }
        catch (Exception) when (!ct.IsCancellationRequested)
        {
            // Timeout, bad status, odd page: the link is still saved, just without a nice preview.
            return Fallback(uri, info);
        }
    }

    private async Task<PreviewResult> YoutubeAsync(LinkInfo info, CancellationToken ct)
    {
        var fallback = new PreviewResult("youtube", info.CanonicalUrl, null, $"https://i.ytimg.com/vi/{info.VideoId}/hqdefault.jpg", "YouTube");
        try
        {
            // The address below is fixed, only the video link changes, so user input never picks the server we call.
            var oembed = new Uri("https://www.youtube.com/oembed?format=json&url=" + Uri.EscapeDataString(info.CanonicalUrl));
            var res = await fetcher.FetchAsync(oembed, MaxJsonBytes, ct);
            using var doc = JsonDocument.Parse(res.Body);
            var root = doc.RootElement;
            var title = OpenGraphParser.Clean(Str(root, "title"));
            var thumb = Str(root, "thumbnail_url");
            if (thumb == null || !thumb.StartsWith("https://", StringComparison.OrdinalIgnoreCase)) thumb = fallback.ThumbnailUrl;
            return fallback with { Title = title, ThumbnailUrl = thumb };
        }
        catch (Exception) when (!ct.IsCancellationRequested) { return fallback; }
    }

    private async Task<PreviewResult> PageAsync(Uri uri, LinkInfo info, CancellationToken ct)
    {
        var res = await fetcher.FetchAsync(uri, MaxPageBytes, ct);
        var og = OpenGraphParser.Parse(res.Body, res.FinalUri);
        var provider = info.Kind == "instagram" ? "Instagram" : og.SiteName ?? res.FinalUri.Host.Replace("www.", "");
        return new PreviewResult(info.Kind, info.CanonicalUrl, og.Title, og.Image, provider);
    }

    private static PreviewResult Fallback(Uri uri, LinkInfo info) =>
        new(info.Kind, info.CanonicalUrl, null, null, info.Kind switch
        {
            "instagram" => "Instagram",
            "youtube" => "YouTube",
            _ => uri.Host.Replace("www.", ""),
        });

    private static string? Str(JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;
}
