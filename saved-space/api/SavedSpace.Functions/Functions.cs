using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using SavedSpace.Core;

namespace SavedSpace.Functions;

// Same-origin on Azure Static Web Apps (the app and /api share one address), so no CORS headers are added on purpose.
public sealed class Functions(PreviewHandler handler)
{
    [Function("health")]
    public IActionResult Health([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "health")] HttpRequest req) =>
        new OkObjectResult(new
        {
            ok = true,
            configured = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("SUPABASE_URL")),
        });

    [Function("preview")]
    public async Task<IActionResult> Preview([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "preview")] HttpRequest req, CancellationToken ct)
    {
        var token = PreviewHandler.ExtractToken(req.Headers["X-Access-Token"], req.Headers.Authorization);
        var result = await handler.HandleAsync(token, req.Query["url"], ct);
        return new ObjectResult(result.Body) { StatusCode = result.Status };
    }
}
