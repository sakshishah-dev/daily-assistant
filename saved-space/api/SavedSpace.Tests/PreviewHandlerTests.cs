using SavedSpace.Core;

namespace SavedSpace.Tests;

public class PreviewHandlerTests
{
    private sealed class Tokens(string? user) : ITokenValidator
    {
        public Task<string?> ValidateAsync(string token, CancellationToken ct) => Task.FromResult(token == "good" ? user : null);
    }

    private static PreviewHandler Make(int limit = 20, string? user = "u1")
    {
        var f = T.Fetcher(new FakeHandler(_ => T.Html("<title>Hello</title>")));
        return new PreviewHandler(new Tokens(user), new PreviewService(f), new RateLimiter(limit));
    }

    [Theory]
    [InlineData(null)] [InlineData("")] [InlineData("bad")]
    public async Task Needs_a_valid_login(string? token) =>
        Assert.Equal(401, (await Make().HandleAsync(token, "https://example.com/", default)).Status);

    [Fact]
    public async Task Bad_urls_are_400() =>
        Assert.Equal(400, (await Make().HandleAsync("good", "http://127.0.0.1/", default)).Status);

    [Fact]
    public async Task Good_request_is_200_and_limit_gives_429()
    {
        var h = Make(limit: 2);
        Assert.Equal(200, (await h.HandleAsync("good", "https://example.com/", default)).Status);
        Assert.Equal(200, (await h.HandleAsync("good", "https://example.com/", default)).Status);
        Assert.Equal(429, (await h.HandleAsync("good", "https://example.com/", default)).Status);
    }

    [Theory]
    [InlineData("tok", null, "tok")]
    [InlineData(null, "Bearer abc", "abc")]
    [InlineData("tok", "Bearer abc", "tok")]
    [InlineData(null, "Basic abc", null)]
    [InlineData(null, null, null)]
    public void Extracts_token(string? x, string? auth, string? expected) => Assert.Equal(expected, PreviewHandler.ExtractToken(x, auth));
}
