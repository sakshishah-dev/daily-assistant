using System.Text.RegularExpressions;

namespace SavedSpace.Core;

public sealed record LinkInfo(string Kind, string CanonicalUrl, string? VideoId);

/// <summary>Works out whether a link is YouTube, Instagram or a normal web page.</summary>
public static partial class LinkClassifier
{
    [GeneratedRegex("^[A-Za-z0-9_-]{11}$")]
    private static partial Regex YoutubeId();

    [GeneratedRegex("^[A-Za-z0-9_-]{5,40}$")]
    private static partial Regex InstagramId();

    public static LinkInfo Classify(Uri uri)
    {
        var host = uri.Host.ToLowerInvariant();
        if (host.StartsWith("www.")) host = host[4..];
        var segments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);

        if (host == "youtu.be" && segments.Length >= 1 && YoutubeId().IsMatch(segments[0]))
            return Youtube(segments[0]);

        if (host is "youtube.com" or "m.youtube.com" or "music.youtube.com" or "youtube-nocookie.com")
        {
            string? id = null;
            if (segments.Length >= 1 && segments[0] == "watch")
                id = GetQuery(uri.Query, "v");
            else if (segments.Length >= 2 && segments[0] is "shorts" or "embed" or "live" or "v")
                id = segments[1];
            if (id != null && YoutubeId().IsMatch(id)) return Youtube(id);
        }

        if (host == "instagram.com")
        {
            // /reel/ID, /p/ID, /tv/ID, and the same after a user name: /user/reel/ID
            for (var i = 0; i < segments.Length - 1 && i < 2; i++)
            {
                if (segments[i] is "reel" or "reels" or "p" or "tv" && InstagramId().IsMatch(segments[i + 1]))
                {
                    var type = segments[i] == "reels" ? "reel" : segments[i];
                    return new LinkInfo("instagram", $"https://www.instagram.com/{type}/{segments[i + 1]}/", segments[i + 1]);
                }
            }
            return new LinkInfo("instagram", uri.GetLeftPart(UriPartial.Path), null);
        }

        return new LinkInfo("web", uri.ToString(), null);
    }

    private static LinkInfo Youtube(string id) => new("youtube", $"https://www.youtube.com/watch?v={id}", id);

    private static string? GetQuery(string query, string key)
    {
        foreach (var part in query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var kv = part.Split('=', 2);
            if (kv[0] == key) return kv.Length > 1 ? Uri.UnescapeDataString(kv[1]) : null;
        }
        return null;
    }
}
