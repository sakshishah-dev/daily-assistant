using SavedSpace.Core;

// Local stand-in for the Azure Function: same handler, run with `dotnet run` on http://localhost:5080.
var builder = WebApplication.CreateBuilder(args);
var supabaseUrl = builder.Configuration["SUPABASE_URL"] ?? throw new InvalidOperationException("Set SUPABASE_URL (see README).");
var publishableKey = builder.Configuration["SUPABASE_PUBLISHABLE_KEY"];
var allowedOrigin = builder.Configuration["ALLOWED_ORIGIN"] ?? "http://localhost:4200";

builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(allowedOrigin).WithHeaders("X-Access-Token", "Authorization").WithMethods("GET")));
builder.Services.AddSingleton<ITokenValidator>(_ => new SupabaseTokenValidator(supabaseUrl, publishableKey));
builder.Services.AddSingleton<SafeFetcher>();
builder.Services.AddSingleton<PreviewService>();
builder.Services.AddSingleton(new RateLimiter());
builder.Services.AddSingleton<PreviewHandler>();

var app = builder.Build();
app.UseCors();

app.MapGet("/api/health", () => Results.Ok(new { ok = true }));
app.MapGet("/api/preview", async (HttpRequest req, PreviewHandler handler, CancellationToken ct) =>
{
    var token = PreviewHandler.ExtractToken(req.Headers["X-Access-Token"], req.Headers.Authorization);
    var result = await handler.HandleAsync(token, req.Query["url"], ct);
    return Results.Json(result.Body, statusCode: result.Status);
});

app.Run("http://localhost:5080");

public partial class Program;
