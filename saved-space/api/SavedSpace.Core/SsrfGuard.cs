using System.Net;
using System.Net.Sockets;

namespace SavedSpace.Core;

/// <summary>Rules that keep the preview fetcher from being tricked into calling private or internal addresses.</summary>
public static class SsrfGuard
{
    public const int MaxUrlLength = 2048;

    /// <summary>Returns true when an address must never be contacted (private, loopback, link-local, reserved...).</summary>
    public static bool IsBlockedAddress(IPAddress ip)
    {
        if (ip.IsIPv4MappedToIPv6) ip = ip.MapToIPv4();

        if (ip.AddressFamily == AddressFamily.InterNetwork)
        {
            var b = ip.GetAddressBytes();
            return b[0] == 0                                         // 0.0.0.0/8 "this network"
                || b[0] == 10                                        // 10.0.0.0/8 private
                || (b[0] == 100 && b[1] >= 64 && b[1] <= 127)       // 100.64.0.0/10 carrier-grade NAT
                || b[0] == 127                                       // loopback
                || (b[0] == 169 && b[1] == 254)                      // link-local, cloud metadata
                || (b[0] == 172 && b[1] >= 16 && b[1] <= 31)        // 172.16.0.0/12 private
                || (b[0] == 192 && b[1] == 0 && b[2] == 0)          // 192.0.0.0/24
                || (b[0] == 192 && b[1] == 0 && b[2] == 2)          // documentation
                || (b[0] == 192 && b[1] == 88 && b[2] == 99)        // 6to4 relay
                || (b[0] == 192 && b[1] == 168)                      // 192.168.0.0/16 private
                || (b[0] == 198 && (b[1] == 18 || b[1] == 19))      // benchmarking
                || (b[0] == 198 && b[1] == 51 && b[2] == 100)       // documentation
                || (b[0] == 203 && b[1] == 0 && b[2] == 113)        // documentation
                || b[0] >= 224;                                      // multicast, reserved, broadcast
        }

        if (ip.AddressFamily == AddressFamily.InterNetworkV6)
        {
            if (IPAddress.IsLoopback(ip) || ip.Equals(IPAddress.IPv6None) || ip.Equals(IPAddress.IPv6Any)) return true;
            if (ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal || ip.IsIPv6Multicast) return true;
            var b = ip.GetAddressBytes();
            if ((b[0] & 0xFE) == 0xFC) return true;                                   // fc00::/7 unique local
            if (b[0] == 0x20 && b[1] == 0x01 && b[2] == 0x0D && b[3] == 0xB8) return true; // 2001:db8::/32 documentation
            if (b[0] == 0x20 && b[1] == 0x01 && b[2] == 0x00 && b[3] == 0x00) return true; // Teredo
            if (b[0] == 0x20 && b[1] == 0x02)                                          // 6to4: embedded IPv4
                return IsBlockedAddress(new IPAddress(new[] { b[2], b[3], b[4], b[5] }));
            if (b[0] == 0x00 && b[1] == 0x64 && b[2] == 0xFF && b[3] == 0x9B)         // NAT64: embedded IPv4
                return IsBlockedAddress(new IPAddress(new[] { b[12], b[13], b[14], b[15] }));
            return false;
        }

        return true; // unknown address family: refuse
    }

    /// <summary>Checks the shape of a URL before any network call. Only http/https, ports 80/443, no user info.</summary>
    public static bool TryValidateUrl(string? raw, out Uri? uri, out string? error)
    {
        uri = null;
        error = null;
        if (string.IsNullOrWhiteSpace(raw)) { error = "Missing link."; return false; }
        raw = raw.Trim();
        if (raw.Length > MaxUrlLength) { error = "That link is too long."; return false; }
        if (!Uri.TryCreate(raw, UriKind.Absolute, out var parsed)) { error = "That does not look like a link."; return false; }
        if (parsed.Scheme != Uri.UriSchemeHttp && parsed.Scheme != Uri.UriSchemeHttps) { error = "Only http and https links are allowed."; return false; }
        if (!string.IsNullOrEmpty(parsed.UserInfo)) { error = "Links with a user name or password are not allowed."; return false; }
        if (parsed.Port != 80 && parsed.Port != 443) { error = "That link uses a port that is not allowed."; return false; }
        if (string.IsNullOrEmpty(parsed.Host)) { error = "That does not look like a link."; return false; }

        var host = parsed.DnsSafeHost.Trim('[', ']');
        if (IPAddress.TryParse(host, out var literal) && IsBlockedAddress(literal)) { error = "That link points to a private address."; return false; }
        if (host.Equals("localhost", StringComparison.OrdinalIgnoreCase) || host.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase)
            || host.EndsWith(".local", StringComparison.OrdinalIgnoreCase) || host.EndsWith(".internal", StringComparison.OrdinalIgnoreCase))
        { error = "That link points to a private address."; return false; }

        uri = parsed;
        return true;
    }
}
