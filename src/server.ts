import app from "./app";

const PORT = process.env.PORT || 5000;

const bootstrap = () => {
  const server = app.listen(Number(PORT), () => {});

  process.on("unhandledRejection", (err: Error) => {
    server.close(() => {
      process.exit(1);
    });
  });

  process.on("uncaughtException", (err: Error) => {
    server.close(() => {
      process.exit(1);
    });
  });
};

bootstrap();
