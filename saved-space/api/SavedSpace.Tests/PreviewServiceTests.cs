using SavedSpace.Core;

namespace SavedSpace.Tests;

public class PreviewServiceTests
{
    [Fact]
    public async Task Youtube_uses_oembed_title_and_thumbnail()
    {
        var handler = new FakeHandler(_ => T.Html("""{"title":"Full body workout","thumbnail_url":"https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"}""", "application/json"));
        using var f = T.Fetcher(handler);
        var r = await new PreviewService(f).GetAsync(new Uri("https://youtu.be/dQw4w9WgXcQ"), default);
        Assert.Equal("youtube", r.Kind);
        Assert.Equal("Full body workout", r.Title);
        Assert.Equal("YouTube", r.Provider);
        Assert.Equal("www.youtube.com", handler.Requests[0].Host);
        Assert.Contains("oembed", handler.Requests[0].AbsolutePath);
    }

    [Fact]
    public async Task Youtube_falls_back_to_standard_thumbnail_when_oembed_fails()
    {
        using var f = T.Fetcher(new FakeHandler(_ => new(System.Net.HttpStatusCode.NotFound)));
        var r = await new PreviewService(f).GetAsync(new Uri("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), default);
        Assert.Null(r.Title);
        Assert.Equal("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg", r.ThumbnailUrl);
    }

    [Fact]
    public async Task Web_page_uses_open_graph()
    {
        using var f = T.Fetcher(new FakeHandler(_ => T.Html("<meta property=\"og:title\" content=\"Best ramen\"><meta property=\"og:image\" content=\"https://x.com/r.jpg\">")));
        var r = await new PreviewService(f).GetAsync(new Uri("https://www.blog.com/ramen"), default);
        Assert.Equal(("web", "Best ramen", "https://x.com/r.jpg", "blog.com"), (r.Kind, r.Title, r.ThumbnailUrl, r.Provider));
    }

    [Fact]
    public async Task Instagram_login_wall_still_returns_a_usable_result()
    {
        using var f = T.Fetcher(new FakeHandler(_ => new(System.Net.HttpStatusCode.Forbidden)));
        var r = await new PreviewService(f).GetAsync(new Uri("https://www.instagram.com/reel/C1a2B3c4D5e/"), default);
        Assert.Equal("instagram", r.Kind);
        Assert.Null(r.Title);
        Assert.Equal("Instagram", r.Provider);
    }

    [Fact]
    public async Task Private_redirect_surfaces_as_unsafe_not_as_a_quiet_fallback()
    {
        using var f = T.Fetcher(new FakeHandler(_ => T.Redirect("http://10.0.0.1/")));
        await Assert.ThrowsAsync<UnsafeUrlException>(() => new PreviewService(f).GetAsync(new Uri("https://example.com/"), default));
    }
}
