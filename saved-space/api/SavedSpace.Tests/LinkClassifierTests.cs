using SavedSpace.Core;

namespace SavedSpace.Tests;

public class LinkClassifierTests
{
    [Theory]
    [InlineData("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s")]
    [InlineData("https://youtu.be/dQw4w9WgXcQ?si=abc")]
    [InlineData("https://m.youtube.com/watch?v=dQw4w9WgXcQ")]
    [InlineData("https://www.youtube.com/shorts/dQw4w9WgXcQ")]
    [InlineData("https://www.youtube.com/embed/dQw4w9WgXcQ")]
    [InlineData("https://www.youtube.com/live/dQw4w9WgXcQ")]
    public void Finds_youtube_video(string url)
    {
        var info = LinkClassifier.Classify(new Uri(url));
        Assert.Equal("youtube", info.Kind);
        Assert.Equal("dQw4w9WgXcQ", info.VideoId);
        Assert.Equal("https://www.youtube.com/watch?v=dQw4w9WgXcQ", info.CanonicalUrl);
    }

    [Theory]
    [InlineData("https://www.instagram.com/reel/C1a2B3c4D5e/?igsh=xyz", "https://www.instagram.com/reel/C1a2B3c4D5e/")]
    [InlineData("https://instagram.com/p/C1a2B3c4D5e/", "https://www.instagram.com/p/C1a2B3c4D5e/")]
    [InlineData("https://www.instagram.com/someone/reel/C1a2B3c4D5e/", "https://www.instagram.com/reel/C1a2B3c4D5e/")]
    [InlineData("https://www.instagram.com/reels/C1a2B3c4D5e/", "https://www.instagram.com/reel/C1a2B3c4D5e/")]
    public void Finds_instagram_post(string url, string canonical)
    {
        var info = LinkClassifier.Classify(new Uri(url));
        Assert.Equal("instagram", info.Kind);
        Assert.Equal("C1a2B3c4D5e", info.VideoId);
        Assert.Equal(canonical, info.CanonicalUrl);
    }

    [Theory]
    [InlineData("https://www.youtube.com/")]
    [InlineData("https://www.youtube.com/watch?v=short")]
    [InlineData("https://evil.com/watch?v=dQw4w9WgXcQ")]
    [InlineData("https://notyoutube.com/watch?v=dQw4w9WgXcQ")]
    [InlineData("https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ")]
    public void Treats_other_links_as_web(string url) => Assert.Equal("web", LinkClassifier.Classify(new Uri(url)).Kind);

    [Fact]
    public void Instagram_profile_is_instagram_without_id()
    {
        var info = LinkClassifier.Classify(new Uri("https://www.instagram.com/someone/"));
        Assert.Equal("instagram", info.Kind);
        Assert.Null(info.VideoId);
    }
}
