namespace SavedSpace.Core;

public sealed record HandlerResult(int Status, object Body);

/// <summary>The whole /api/preview request in one place, shared by the Azure Function and the local dev host.</summary>
public sealed class PreviewHandler(ITokenValidator tokens, PreviewService previews, RateLimiter limiter)
{
    public async Task<HandlerResult> HandleAsync(string? accessToken, string? rawUrl, CancellationToken ct)
    {
        var userId = string.IsNullOrEmpty(accessToken) ? null : await tokens.ValidateAsync(accessToken, ct);
        if (userId == null) return new(401, new { error = "Please sign in again." });
        if (!limiter.Allow(userId)) return new(429, new { error = "Too many previews, wait a minute." });
        if (!SsrfGuard.TryValidateUrl(rawUrl, out var uri, out var error)) return new(400, new { error });

        try { return new(200, await previews.GetAsync(uri!, ct)); }
        catch (UnsafeUrlException e) { return new(400, new { error = e.Message }); }
        catch (OperationCanceledException) { return new(504, new { error = "The preview took too long." }); }
    }

    /// <summary>Pulls the token from X-Access-Token (used on Static Web Apps, which replaces Authorization) or Authorization: Bearer.</summary>
    public static string? ExtractToken(string? xAccessToken, string? authorization)
    {
        if (!string.IsNullOrWhiteSpace(xAccessToken)) return xAccessToken.Trim();
        if (authorization != null && authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)) return authorization[7..].Trim();
        return null;
    }
}
