using System.Net;
using System.Text.RegularExpressions;

namespace SavedSpace.Core;

public sealed record OpenGraphData(string? Title, string? Image, string? SiteName);

/// <summary>Reads the title and image out of a page's meta tags (Open Graph, then Twitter card, then the plain title tag).</summary>
public static partial class OpenGraphParser
{
    public const int MaxTitleLength = 300;

    [GeneratedRegex("<meta\\s[^>]*>", RegexOptions.IgnoreCase | RegexOptions.Singleline)]
    private static partial Regex MetaTag();

    [GeneratedRegex("([a-zA-Z_:][-a-zA-Z0-9_:.]*)\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>\"']+))", RegexOptions.Singleline)]
    private static partial Regex Attribute();

    [GeneratedRegex("<title[^>]*>(.*?)</title>", RegexOptions.IgnoreCase | RegexOptions.Singleline)]
    private static partial Regex TitleTag();

    [GeneratedRegex("<[^>]*>")]
    private static partial Regex AnyTag();

    [GeneratedRegex("\\s+")]
    private static partial Regex Spaces();

    public static OpenGraphData Parse(string html, Uri baseUri)
    {
        var meta = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (Match m in MetaTag().Matches(html))
        {
            string? key = null, content = null;
            foreach (Match a in Attribute().Matches(m.Value))
            {
                var name = a.Groups[1].Value.ToLowerInvariant();
                var value = a.Groups[2].Success ? a.Groups[2].Value : a.Groups[3].Success ? a.Groups[3].Value : a.Groups[4].Value;
                if (name is "property" or "name") key = value.ToLowerInvariant();
                else if (name == "content") content = value;
            }
            if (key != null && content != null) meta.TryAdd(key, content);
        }

        string? title = Clean(First(meta, "og:title", "twitter:title"));
        if (title == null)
        {
            var t = TitleTag().Match(html);
            if (t.Success) title = Clean(t.Groups[1].Value);
        }

        string? image = null;
        var rawImage = First(meta, "og:image:secure_url", "og:image", "twitter:image", "twitter:image:src");
        if (!string.IsNullOrWhiteSpace(rawImage) && Uri.TryCreate(baseUri, WebUtility.HtmlDecode(rawImage.Trim()), out var abs)
            && abs.Scheme == Uri.UriSchemeHttps && abs.AbsoluteUri.Length <= SsrfGuard.MaxUrlLength)
            image = abs.AbsoluteUri; // https only: http images are blocked inside an https app anyway

        return new OpenGraphData(title, image, Clean(First(meta, "og:site_name")));
    }

    private static string? First(Dictionary<string, string> meta, params string[] keys)
    {
        foreach (var k in keys) if (meta.TryGetValue(k, out var v) && !string.IsNullOrWhiteSpace(v)) return v;
        return null;
    }

    /// <summary>Decodes entities, strips any tags, collapses spaces and limits the length. The app also escapes text when it shows it.</summary>
    public static string? Clean(string? text)
    {
        if (text == null) return null;
        text = AnyTag().Replace(WebUtility.HtmlDecode(text), " ");
        text = Spaces().Replace(text, " ").Trim();
        if (text.Length == 0) return null;
        return text.Length > MaxTitleLength ? text[..MaxTitleLength].TrimEnd() : text;
    }
}
