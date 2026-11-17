using System.Net;
using SavedSpace.Core;

namespace SavedSpace.Tests;

public class SsrfGuardTests
{
    [Theory]
    [InlineData("127.0.0.1")] [InlineData("127.1.2.3")] [InlineData("10.0.0.5")] [InlineData("172.16.0.1")] [InlineData("172.31.255.255")]
    [InlineData("192.168.1.1")] [InlineData("169.254.169.254")] [InlineData("0.0.0.0")] [InlineData("100.64.0.1")]
    [InlineData("224.0.0.1")] [InlineData("255.255.255.255")] [InlineData("198.18.0.1")]
    [InlineData("::1")] [InlineData("::")] [InlineData("fe80::1")] [InlineData("fc00::1")] [InlineData("fd12:3456::1")]
    [InlineData("ff02::1")] [InlineData("::ffff:127.0.0.1")] [InlineData("::ffff:10.0.0.1")] [InlineData("2002:7f00:0001::1")]
    [InlineData("64:ff9b::7f00:1")] [InlineData("2001:db8::1")]
    public void Blocks_private_and_special_addresses(string ip) => Assert.True(SsrfGuard.IsBlockedAddress(IPAddress.Parse(ip)));

    [Theory]
    [InlineData("8.8.8.8")] [InlineData("93.184.216.34")] [InlineData("172.15.0.1")] [InlineData("172.32.0.1")]
    [InlineData("100.63.0.1")] [InlineData("2606:4700:4700::1111")] [InlineData("::ffff:8.8.8.8")]
    public void Allows_public_addresses(string ip) => Assert.False(SsrfGuard.IsBlockedAddress(IPAddress.Parse(ip)));

    [Theory]
    [InlineData("https://www.youtube.com/watch?v=dQw4w9WgXcQ")]
    [InlineData("http://example.com/page")]
    [InlineData("https://example.com:443/x")]
    public void Accepts_normal_links(string url) => Assert.True(SsrfGuard.TryValidateUrl(url, out var uri, out _) && uri != null);

    [Theory]
    [InlineData(null)] [InlineData("")] [InlineData("   ")] [InlineData("not a url")]
    [InlineData("ftp://example.com/file")] [InlineData("file:///etc/passwd")] [InlineData("javascript:alert(1)")]
    [InlineData("http://localhost/x")] [InlineData("http://foo.localhost/x")] [InlineData("http://printer.local/")]
    [InlineData("http://127.0.0.1/")] [InlineData("http://[::1]/")] [InlineData("http://169.254.169.254/latest/meta-data/")]
    [InlineData("http://2130706433/")]        // decimal form of 127.0.0.1
    [InlineData("http://0x7f.0.0.1/")]        // hex form
    [InlineData("http://user:pass@example.com/")]
    [InlineData("https://example.com:8443/")] [InlineData("http://example.com:22/")]
    public void Rejects_unsafe_or_broken_links(string? url) => Assert.False(SsrfGuard.TryValidateUrl(url, out _, out var err) || err == null);

    [Fact]
    public void Rejects_very_long_links() =>
        Assert.False(SsrfGuard.TryValidateUrl("https://example.com/" + new string('a', 3000), out _, out _));
}
