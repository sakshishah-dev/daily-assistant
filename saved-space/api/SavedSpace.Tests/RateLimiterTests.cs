using SavedSpace.Core;

namespace SavedSpace.Tests;

public class RateLimiterTests
{
    [Fact]
    public void Blocks_after_limit_and_recovers_after_window()
    {
        var now = DateTimeOffset.UnixEpoch;
        var rl = new RateLimiter(3, TimeSpan.FromMinutes(1), () => now);
        Assert.True(rl.Allow("a")); Assert.True(rl.Allow("a")); Assert.True(rl.Allow("a"));
        Assert.False(rl.Allow("a"));
        Assert.True(rl.Allow("b"));                    // another user is not affected
        now += TimeSpan.FromSeconds(61);
        Assert.True(rl.Allow("a"));
    }
}
