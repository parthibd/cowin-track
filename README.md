# Cowin Telegram Bot

![Bot Logo](logo.jpg)

Telegram bot to track vacant vaccine slots according to pincode or district and notify user as soon as they become available.

# Features

1. Notify by pincode
2. Notify by district
3. No flooding with notifications, notified only when new or updated data is available.
5. Very active, frequently checks for data.
4. Cares about CoWin, has multiple checks in place so that we do not flood the servers with requests and puts additional strain.
5. Made with ❤️ in India. 🦚

# Requirements

1. Node.js 14
2. MySQL 8 or 5.7 / MariaDB 10.4

# Installation

1. Copy `.env.example` to `.env`.
2. Make the following changes in the `.env` environment file.
3. Change `BOT_TOKEN` to the auth token for your bot provided by **BotFather**.
4. Change `DATABASE_URL` in the format ```mysql://USER:PASSWORD@HOST:PORT/DATABASE``` according to your needs.
5. Run ```npx prisma migrate``` to run the database migrations.
5. ```yarn```
6. You are done!

# Note

There will be no versioned releases as such as this bot is always a work in progress. Always sync with the master branch.
