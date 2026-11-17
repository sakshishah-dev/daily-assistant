using SavedSpace.Core;

namespace SavedSpace.Tests;

public class OpenGraphParserTests
{
    private static readonly Uri Base = new("https://example.com/a/b");

    [Fact]
    public void Reads_open_graph_tags()
    {
        var og = OpenGraphParser.Parse("""
            <html><head><title>Plain title</title>
            <meta property="og:title" content="Great &amp; simple pasta">
            <meta property="og:image" content="https://cdn.example.com/p.jpg">
            <meta property="og:site_name" content="Foodie"></head></html>
            """, Base);
        Assert.Equal("Great & simple pasta", og.Title);
        Assert.Equal("https://cdn.example.com/p.jpg", og.Image);
        Assert.Equal("Foodie", og.SiteName);
    }

    [Fact]
    public void Handles_attribute_order_single_quotes_and_relative_image()
    {
        var og = OpenGraphParser.Parse("<meta content='Hello' property='og:title'><meta content=\"/img/x.png\" name=\"twitter:image\">", Base);
        Assert.Equal("Hello", og.Title);
        Assert.Equal("https://example.com/img/x.png", og.Image);
    }

    [Fact]
    public void Falls_back_to_title_tag_and_collapses_spaces()
    {
        var og = OpenGraphParser.Parse("<title>\n  My   page \n</title>", Base);
        Assert.Equal("My page", og.Title);
        Assert.Null(og.Image);
    }

    [Fact]
    public void Drops_http_and_odd_images()
    {
        Assert.Null(OpenGraphParser.Parse("<meta property=\"og:image\" content=\"http://x.com/a.png\">", Base).Image);
        Assert.Null(OpenGraphParser.Parse("<meta property=\"og:image\" content=\"javascript:alert(1)\">", Base).Image);
        Assert.Null(OpenGraphParser.Parse("<meta property=\"og:image\" content=\"data:image/png;base64,AAAA\">", Base).Image);
    }

    [Fact]
    public void Strips_tags_and_limits_length()
    {
        var og = OpenGraphParser.Parse("<meta property=\"og:title\" content=\"&lt;script&gt;alert(1)&lt;/script&gt;Hi\">", Base);
        Assert.Equal("alert(1) Hi", og.Title);
        var longTitle = OpenGraphParser.Clean(new string('x', 1000));
        Assert.Equal(OpenGraphParser.MaxTitleLength, longTitle!.Length);
    }

    [Fact]
    public void Empty_page_gives_nothing()
    {
        var og = OpenGraphParser.Parse("<html></html>", Base);
        Assert.Null(og.Title); Assert.Null(og.Image);
    }
}
