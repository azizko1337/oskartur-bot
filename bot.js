const puppeteer = require("puppeteer");
const nodemailer = require("nodemailer");
const fs = require("fs");
const config = require("./config.js");

const checkDrives = async () => {
  const logger = fs.createWriteStream("./log.txt", {
    flags: "a",
  });

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox"],
  });

  const page = await browser.newPage();
  await page.goto("https://oskartur.pl/logowanie,4");
  await page.$eval("div.popup_close>a", (el) => el.click());

  await page.type("#name", config.PESEL);
  await page.type("#lpass", config.PASSWORD);
  await page.$eval("#btnlogin", (el) => el.click());

  await page.goto("https://oskartur.pl/jazdy,52");

  const drives = await page.evaluate(async () => {
    const res = await fetch("https://oskartur.pl/ajax/jazdy.php", {
      headers: {
        accept: "*/*",
        "accept-language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "sec-ch-ua":
          '" Not;A Brand";v="99", "Google Chrome";v="91", "Chromium";v="91"',
        "sec-ch-ua-mobile": "?0",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-requested-with": "XMLHttpRequest",
      },
      referrer: "https://oskartur.pl/jazdy,52",
      referrerPolicy: "strict-origin-when-cross-origin",
      body: "f=readFree&filters%5B0%5D%5Bname%5D=iid&filters%5B0%5D%5Bvalue%5D=0&filters%5B1%5D%5Bname%5D=dataOd&filters%5B1%5D%5Bvalue%5D=2021-01-01&filters%5B2%5D%5Bname%5D=dataDo&filters%5B2%5D%5Bvalue%5D=2021-12-31&filters%5B3%5D%5Bname%5D=godzOd&filters%5B3%5D%5Bvalue%5D=7%3A00&filters%5B4%5D%5Bname%5D=godzDo&filters%5B4%5D%5Bvalue%5D=22%3A00",
      method: "POST",
      mode: "cors",
      credentials: "include",
    });
    const data = await res.json();
    const drives = data.success;
    return drives;
  });

  await page.goto("https://oskartur.pl/logout,99");

  let now = new Date();
  function prettyDate(date) {
    const localeSpecificTime = date.toLocaleTimeString();
    return localeSpecificTime.replace(/:\d+ /, " ");
  }
  now = prettyDate(now);

  if (drives.includes("Umawiam się")) {
    console.log(`[${now}] CHECK: DRIVES`);
    logger.write(`[${now}] CHECK: DRIVES \n`);
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.GMAIL_AUTH_EMAIL,
        pass: config.GMAIL_AUTH_PASSWORD,
      },
    });
    const mailOptions = {
      from: config.GMAIL_AUTH_EMAIL,
      to: config.MAIL_TO,
      subject: "THERE ARE FREE DRIVES!",
      text: "gl!",
    };
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
        logger.write(error);
      } else {
        console.log("Email sent: " + info.response);
        logger.write("Email sent: " + info.response + " \n");
      }
    });
  } else {
    console.log(`[${now}] CHECK: NO DRIVES`);
    logger.write(`[${now}] CHECK: NO DRIVES \n`);
  }

  await browser.close();

  const timeBeforeNextCheck = 900000 + Math.random() * 30 * 60 * 1000;
  console.log(`Next update within ${timeBeforeNextCheck / 1000 / 60}m`);
  logger.write(`Next update within ${timeBeforeNextCheck / 1000 / 60}m \n`);
  logger.close();
  setTimeout(checkDrives, timeBeforeNextCheck);
};

checkDrives();
