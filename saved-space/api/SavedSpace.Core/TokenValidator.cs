using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace SavedSpace.Core;

public interface ITokenValidator
{
    /// <summary>Returns the user id when the Supabase login token is genuine and not expired, otherwise null.</summary>
    Task<string?> ValidateAsync(string token, CancellationToken ct);
}

/// <summary>
/// Checks a Supabase access token without holding any secret.
/// Tokens signed with an asymmetric key (the current Supabase default) are verified locally against the project's public key set.
/// Older projects that still sign with a shared secret (HS256) are verified by asking Supabase's /auth/v1/user.
/// </summary>
public sealed class SupabaseTokenValidator : ITokenValidator
{
    private readonly string _supabaseUrl;
    private readonly string? _publishableKey;
    private readonly HttpClient _http;
    private readonly JsonWebTokenHandler _handler = new();
    private JsonWebKeySet? _keys;
    private DateTimeOffset _keysFetched;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public SupabaseTokenValidator(string supabaseUrl, string? publishableKey, HttpClient? http = null)
    {
        _supabaseUrl = supabaseUrl.TrimEnd('/');
        _publishableKey = publishableKey;
        _http = http ?? new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
    }

    public async Task<string?> ValidateAsync(string token, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length > 8192) return null;
        try
        {
            var jwt = _handler.ReadJsonWebToken(token);
            return jwt.Alg.StartsWith("HS", StringComparison.Ordinal)
                ? await ValidateRemotelyAsync(token, ct)
                : await ValidateWithKeysAsync(token, jwt.Kid, ct);
        }
        catch (Exception) when (!ct.IsCancellationRequested) { return null; }
    }

    private async Task<string?> ValidateWithKeysAsync(string token, string? kid, CancellationToken ct)
    {
        var keys = await GetKeysAsync(forceRefresh: false, ct);
        if (kid != null && !keys.Keys.Any(k => k.Kid == kid)) keys = await GetKeysAsync(forceRefresh: true, ct);

        var result = await _handler.ValidateTokenAsync(token, new TokenValidationParameters
        {
            ValidIssuer = _supabaseUrl + "/auth/v1",
            ValidAudience = "authenticated",
            IssuerSigningKeys = keys.GetSigningKeys(),
            ValidAlgorithms = [SecurityAlgorithms.EcdsaSha256, SecurityAlgorithms.RsaSha256],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
        });
        if (!result.IsValid) return null;
        return result.ClaimsIdentity.FindFirst("sub")?.Value;
    }

    private async Task<JsonWebKeySet> GetKeysAsync(bool forceRefresh, CancellationToken ct)
    {
        await _lock.WaitAsync(ct);
        try
        {
            var age = DateTimeOffset.UtcNow - _keysFetched;
            if (_keys != null && age < TimeSpan.FromMinutes(10) && !(forceRefresh && age > TimeSpan.FromSeconds(30))) return _keys;
            var json = await _http.GetStringAsync(_supabaseUrl + "/auth/v1/.well-known/jwks.json", ct);
            _keys = new JsonWebKeySet(json);
            _keysFetched = DateTimeOffset.UtcNow;
            return _keys;
        }
        finally { _lock.Release(); }
    }

    private async Task<string?> ValidateRemotelyAsync(string token, CancellationToken ct)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, _supabaseUrl + "/auth/v1/user");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (!string.IsNullOrEmpty(_publishableKey)) req.Headers.TryAddWithoutValidation("apikey", _publishableKey);
        using var res = await _http.SendAsync(req, ct);
        if (!res.IsSuccessStatusCode) return null;
        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(ct));
        return doc.RootElement.TryGetProperty("id", out var id) ? id.GetString() : null;
    }
}
