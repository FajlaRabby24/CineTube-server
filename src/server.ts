import app from "./app";

const PORT = process.env.PORT || 5000;

const bootstrap = () => {
  const server = app.listen(Number(PORT), () => {
    console.log(`Server is running on port ${PORT}`);
  });

  process.on("unhandledRejection", (err: Error) => {
    console.error("Unhandled Rejection:", err);
    server.close(() => {
      process.exit(1);
    });
  });

  process.on("uncaughtException", (err: Error) => {
    console.error("Uncaught Exception:", err);
    server.close(() => {
      process.exit(1);
    });
  });
};

bootstrap();
