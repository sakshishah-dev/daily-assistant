using System.Net;
using SavedSpace.Core;

namespace SavedSpace.Tests;

public sealed class FakeHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
{
    public List<Uri> Requests { get; } = new();
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        Requests.Add(request.RequestUri!);
        return Task.FromResult(respond(request));
    }
}

public static class T
{
    public static HttpResponseMessage Html(string body, string type = "text/html") =>
        new(HttpStatusCode.OK) { Content = new StringContent(body, System.Text.Encoding.UTF8, type) };

    public static HttpResponseMessage Redirect(string to) =>
        new(HttpStatusCode.Found) { Headers = { Location = new Uri(to) } };

    /// <summary>Every name resolves to a public address, so only the URL rules and redirects are under test.</summary>
    public static Task<IPAddress[]> PublicDns(string host, CancellationToken ct) => Task.FromResult(new[] { IPAddress.Parse("93.184.216.34") });

    public static SafeFetcher Fetcher(FakeHandler h, Func<string, CancellationToken, Task<IPAddress[]>>? dns = null) => new(dns ?? PublicDns, h);
}
