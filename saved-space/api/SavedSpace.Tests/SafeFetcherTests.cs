using System.Net;
using System.Net.Sockets;
using SavedSpace.Core;

namespace SavedSpace.Tests;

public class SafeFetcherTests
{
    private static readonly CancellationToken Ct = CancellationToken.None;

    [Fact]
    public async Task Fetches_html()
    {
        using var f = T.Fetcher(new FakeHandler(_ => T.Html("<title>Hi</title>")));
        var r = await f.FetchAsync(new Uri("https://example.com/"), 1000, Ct);
        Assert.Contains("Hi", r.Body);
    }

    [Fact]
    public async Task Follows_up_to_three_redirects_then_stops()
    {
        var n = 0;
        using var ok = T.Fetcher(new FakeHandler(_ => n++ < 3 ? T.Redirect($"https://example.com/{n}") : T.Html("done")));
        Assert.Equal("done", (await ok.FetchAsync(new Uri("https://example.com/"), 1000, Ct)).Body);

        using var loop = T.Fetcher(new FakeHandler(_ => T.Redirect("https://example.com/again")));
        await Assert.ThrowsAsync<UnsafeUrlException>(() => loop.FetchAsync(new Uri("https://example.com/"), 1000, Ct));
    }

    [Theory]
    [InlineData("http://127.0.0.1/admin")]
    [InlineData("http://169.254.169.254/latest/meta-data/")]
    [InlineData("http://localhost:80/")]
    [InlineData("ftp://example.com/")]
    public async Task Redirect_to_private_or_bad_target_is_refused_before_any_request(string target)
    {
        var handler = new FakeHandler(_ => T.Redirect(target));
        using var f = T.Fetcher(handler);
        await Assert.ThrowsAsync<UnsafeUrlException>(() => f.FetchAsync(new Uri("https://example.com/"), 1000, Ct));
        Assert.Single(handler.Requests); // only the first public request was made
    }

    [Fact]
    public async Task Name_that_resolves_to_a_private_address_is_refused()
    {
        var handler = new FakeHandler(_ => T.Html("secret"));
        using var f = T.Fetcher(handler, (h, ct) => Task.FromResult(new[] { IPAddress.Parse("93.184.216.34"), IPAddress.Parse("10.0.0.7") }));
        await Assert.ThrowsAsync<UnsafeUrlException>(() => f.FetchAsync(new Uri("https://rebind.example.com/"), 1000, Ct));
        Assert.Empty(handler.Requests);
    }

    [Fact]
    public async Task Refuses_non_text_content()
    {
        using var f = T.Fetcher(new FakeHandler(_ => new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent([1, 2, 3]) { Headers = { { "Content-Type", "video/mp4" } } } }));
        await Assert.ThrowsAsync<UnsafeUrlException>(() => f.FetchAsync(new Uri("https://example.com/v.mp4"), 1000, Ct));
    }

    [Fact]
    public async Task Caps_the_size_read()
    {
        using var f = T.Fetcher(new FakeHandler(_ => T.Html(new string('a', 100_000))));
        var r = await f.FetchAsync(new Uri("https://example.com/"), 5000, Ct);
        Assert.Equal(5000, r.Body.Length);
        Assert.True(r.Truncated);
    }

    [Fact]
    public async Task Real_connection_to_loopback_is_blocked()
    {
        // Uses the real network stack: a local server must never be reached, even by a name that "resolves" to loopback.
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        using var f = new SafeFetcher((h, ct) => Task.FromResult(new[] { IPAddress.Loopback }));
        await Assert.ThrowsAsync<UnsafeUrlException>(() => f.SafeAddressesAsync("anything.example.com", Ct));
        // Port is not 80/443 so URL validation also refuses it:
        await Assert.ThrowsAsync<UnsafeUrlException>(() => f.FetchAsync(new Uri($"http://127.0.0.1:{port}/"), 100, Ct));
        Assert.False(listener.Pending());
    }

    [Fact]
    public async Task Connect_callback_blocks_dns_that_changes_to_a_private_address()
    {
        // First lookup (our check) says public, the connection lookup says loopback: the connect must still fail.
        var calls = 0;
        using var f = new SafeFetcher((h, ct) => Task.FromResult(new[] { calls++ == 0 ? IPAddress.Parse("93.184.216.34") : IPAddress.Loopback }));
        await Assert.ThrowsAnyAsync<Exception>(() => f.FetchAsync(new Uri("http://rebind.example.com/"), 100, Ct));
        Assert.True(calls >= 2);
    }
}
