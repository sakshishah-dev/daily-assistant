using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using SavedSpace.Core;

var builder = FunctionsApplication.CreateBuilder(args);
builder.ConfigureFunctionsWebApplication();

// Both values are public (the project web address and the publishable key). No secret is ever needed here.
var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL") ?? "";
var publishableKey = Environment.GetEnvironmentVariable("SUPABASE_PUBLISHABLE_KEY");

builder.Services.AddSingleton<ITokenValidator>(_ => new SupabaseTokenValidator(supabaseUrl, publishableKey));
builder.Services.AddSingleton<SafeFetcher>();
builder.Services.AddSingleton<PreviewService>();
builder.Services.AddSingleton(new RateLimiter());
builder.Services.AddSingleton<PreviewHandler>();

builder.Build().Run();
