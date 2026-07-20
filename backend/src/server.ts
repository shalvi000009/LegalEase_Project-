import app from "./app";

const PORT = parseInt(process.env.PORT || "4000", 10);
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`🚀 LegalEase Backend listening on http://localhost:${PORT}`);
  console.log(`📚 Swagger documentation live at http://localhost:${PORT}/docs`);
  console.log(`❤️  Health check available at http://localhost:${PORT}/health`);
});
