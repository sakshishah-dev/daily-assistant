namespace SavedSpace.Core;

/// <summary>Simple per-user sliding window limit (kept in memory, per server instance).</summary>
public sealed class RateLimiter(int limit = 20, TimeSpan? window = null, Func<DateTimeOffset>? clock = null)
{
    private readonly TimeSpan _window = window ?? TimeSpan.FromMinutes(1);
    private readonly Func<DateTimeOffset> _clock = clock ?? (() => DateTimeOffset.UtcNow);
    private readonly Dictionary<string, Queue<DateTimeOffset>> _hits = new();
    private readonly object _lock = new();

    public bool Allow(string key)
    {
        var now = _clock();
        lock (_lock)
        {
            if (_hits.Count > 5000)
                foreach (var k in _hits.Where(p => p.Value.Count == 0 || now - p.Value.Peek() > _window).Select(p => p.Key).ToList())
                    _hits.Remove(k);

            if (!_hits.TryGetValue(key, out var q)) _hits[key] = q = new Queue<DateTimeOffset>();
            while (q.Count > 0 && now - q.Peek() > _window) q.Dequeue();
            if (q.Count >= limit) return false;
            q.Enqueue(now);
            return true;
        }
    }
}
