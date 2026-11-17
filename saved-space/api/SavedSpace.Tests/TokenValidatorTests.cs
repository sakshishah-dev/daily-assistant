using System.Net;
using System.Security.Cryptography;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using SavedSpace.Core;

namespace SavedSpace.Tests;

public class TokenValidatorTests
{
    private const string Url = "https://abc.supabase.co";

    private static (SupabaseTokenValidator validator, ECDsaSecurityKey key) Make(Func<HttpRequestMessage, HttpResponseMessage>? extra = null)
    {
        var ecdsa = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var key = new ECDsaSecurityKey(ecdsa) { KeyId = "k1" };
        var jwk = JsonWebKeyConverter.ConvertFromECDsaSecurityKey(key);
        var jwks = new JsonWebKeySet(); jwks.Keys.Add(jwk);
        var json = System.Text.Json.JsonSerializer.Serialize(new { keys = new[] { new { kty = jwk.Kty, crv = jwk.Crv, x = jwk.X, y = jwk.Y, kid = "k1", alg = "ES256", use = "sig" } } });
        var handler = new FakeHandler(r => r.RequestUri!.AbsolutePath.EndsWith("jwks.json") ? T.Html(json, "application/json") : extra?.Invoke(r) ?? new(HttpStatusCode.Unauthorized));
        return (new SupabaseTokenValidator(Url, "pk", new HttpClient(handler)), key);
    }

    private static string Token(SecurityKey key, string issuer = Url + "/auth/v1", string audience = "authenticated", DateTime? expires = null, string sub = "user-1")
    {
        var d = new SecurityTokenDescriptor
        {
            Issuer = issuer, Audience = audience,
            Claims = new Dictionary<string, object> { ["sub"] = sub },
            NotBefore = DateTime.UtcNow.AddMinutes(-10), Expires = expires ?? DateTime.UtcNow.AddMinutes(30),
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.EcdsaSha256),
        };
        return new JsonWebTokenHandler().CreateToken(d);
    }

    [Fact]
    public async Task Accepts_a_genuine_token_and_returns_the_user()
    {
        var (v, key) = Make();
        Assert.Equal("user-1", await v.ValidateAsync(Token(key), default));
    }

    [Fact]
    public async Task Rejects_expired_wrong_issuer_wrong_audience_and_foreign_key()
    {
        var (v, key) = Make();
        Assert.Null(await v.ValidateAsync(Token(key, expires: DateTime.UtcNow.AddMinutes(-5)), default));
        Assert.Null(await v.ValidateAsync(Token(key, issuer: "https://evil.example/auth/v1"), default));
        Assert.Null(await v.ValidateAsync(Token(key, audience: "anon"), default));
        var other = new ECDsaSecurityKey(ECDsa.Create(ECCurve.NamedCurves.nistP256)) { KeyId = "k1" };
        Assert.Null(await v.ValidateAsync(Token(other), default));
    }

    [Theory]
    [InlineData("")] [InlineData("garbage")] [InlineData("a.b.c")]
    public async Task Rejects_garbage(string token) => Assert.Null(await Make().validator.ValidateAsync(token, default));

    [Fact]
    public async Task Shared_secret_tokens_are_checked_with_supabase()
    {
        var (v, _) = Make(r => r.RequestUri!.AbsolutePath.EndsWith("/auth/v1/user") && r.Headers.Authorization?.Scheme == "Bearer"
            ? T.Html("""{"id":"user-9"}""", "application/json") : new(HttpStatusCode.Unauthorized));
        var hs = new SymmetricSecurityKey(RandomNumberGenerator.GetBytes(32));
        var token = new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = Url + "/auth/v1", Audience = "authenticated", Expires = DateTime.UtcNow.AddMinutes(5),
            SigningCredentials = new SigningCredentials(hs, SecurityAlgorithms.HmacSha256),
        });
        Assert.Equal("user-9", await v.ValidateAsync(token, default));
    }
}
