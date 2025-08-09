export function checkUsername(username: string): string | null {
  const usernameRegex = /^[a-zA-Z0-9]+$/;

  if (username.length < 5 || username.length > 32) {
    return "Make sure username ranges from 5 to 32";
  } else if (!usernameRegex.test(username)) {
    return "Make sure username only contains A-Z|a-z|0-9";
  } else {
    return null;
  }
}

export function checkPassword(password: string): string | null {
  const usernameRegex = /^[a-zA-Z0-9]+$/;

  if (password.length < 8) {
    return "Make sure password's length greater than 8";
  } else if (!usernameRegex.test(password)) {
    return "Make sure password only contains A-Z|a-z|0-9";
  } else {
    return null;
  }
}
