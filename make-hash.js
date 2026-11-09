const bcrypt = require("bcrypt");

const password = process.env.ADMIN_PASSWORD;
if (!password) {
    console.error("Задайте ADMIN_PASSWORD в окружении, чтобы создать хеш.");
    process.exitCode = 1;
} else if (Buffer.byteLength(password, "utf8") > 72) {
    console.error("Пароль должен занимать не более 72 байт в UTF-8.");
    process.exitCode = 1;
} else {
    bcrypt.hash(password, 10)
        .then(function (hash) {
            console.log(hash);
        })
        .catch(function (error) {
            console.error("Не удалось создать хеш:", error.message);
            process.exitCode = 1;
        });
}
