(async () => {
  try {
    const response = await fetch(
      "<%= betterAuthUrl %>/api/auth/sign-in/social",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          provider: "google",
          callbackURL: "<%= callbackURL %>",
        }),
      },
    );

    const data = await response.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      document.body.innerHTML = `<div>
                    <p>
                        Error Occurred While Redirecting To Google. Please Try Again Later.
                    </p>
                    </div>`;
    }
  } catch (error) {
    document.body.innerHTML = `<div>
                    <p>
                        Error Occurred While Redirecting To Google. Please Try Again Later.
                        ${error.message}
                    </p>
                    </div>`;
  }
})();
