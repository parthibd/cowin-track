# Cowin Telegram Bot

![Bot Logo](logo.jpg)

Telegram bot to track vacant vaccine slots according to pincode or district and notify user as soon as they become available.

# Requirements

1. Node.js 14
2. MySQL 8 or 5.7 / MariaDB 10.4

# Installation

1. Copy `.env.example` to `.env`.
2. Change `BOT_TOKEN` to the auth token for your bot provided by **BotFather**.
3. Change `DATABASE_URL` in the format ```mysql://USER:PASSWORD@HOST:PORT/DATABASE``` according to your needs.
4. ```yarn```
5. You are done!

# Note

There will be no versioned releases as such as this bot is always a work in progress. Always sync with the master branch.