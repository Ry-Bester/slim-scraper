
const rp = require('request-promise');
const cheerio = require('cheerio');
const fs = require('fs');
const request = require('request');
var shell = require('shelljs');
var path = require('path');
var getDirName = require('path').dirname;
var mkdirp = require('mkdirp');
var https = require("https");
const download = function (uri, filename, callback) {
  request.head(encodeURI(uri), function (err, res, body) {
    mkdirp(getDirName(filename), function (err) {
      if (err) return cb(err);
      request(encodeURI(uri)).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
  });
};
const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}
const urls = [
  '/blog/',
  '/cool-sculpting/'
]
urls.reverse(); //reverse array order because we are using the pop method
const domain = "https://slimstudioatlanta.com";
scrape(urls, "", []);
function scrape(urls, blogIndexContent, blogUrls) {
  sleep(1000).then(() => { //set limiter time here
    if (urls.length > 0) {
      rp(domain + urls.pop()).then(function (html) {
        const buffer = fs.readFileSync('sup.html')
        html = buffer.toString()
        /* SET INDIVIDUAL BLOG URLS HERE */
        let blogUrl = "";
        var $ = cheerio.load(html)
        $(".fusion-post-grid", html).each(function () {
          blogUrls.push($(this).find(".fusion-rollover-link").attr("href"));
        });
        blogIndexContent += "<div>";
        /* SET BLOG IMAGE HERE */
        $(".fusion-post-grid", html).each(function () {
          var noimg = false;
          let img = "";
          if ($(this).find('.fusion-image-wrapper img.wp-post-image').attr("data-orig-src") != undefined) {
            img = $(this).find('.fusion-image-wrapper img.wp-post-image').attr("data-orig-src");//chnge whether lazy loaded or not
          }
          else if ($(this).find('.fusion-image-wrapper img.wp-post-image').attr("src") != undefined) {
            img = $(this).find('.fusion-image-wrapper img.wp-post-image').attr("src");//chnge whether lazy loaded or not
          }
          else {
            noimg = true;
            console.log("no image");
          }
          // if (!noimg) {
          //   const newImgUrl = "/assets/img/blog/" + path.basename(img).trim();
          //   const newImgPath = __dirname + newImgUrl;
          //   console.log(newImgPath);
          //   download(img, newImgPath, function () { console.log(newImgPath) });
          //   blogIndexContent += `<p class="text-center"><a href="${blogUrl}"><img src='${newImgUrl}' /></p></a>`;

          // }
          blogIndexContent += $(this).find(".post-content .entry-title").html();
          blogIndexContent += $(this).find(".post-content .fusion-post-content-container ").html();
        });
        blogIndexContent += "</div>";
        scrape(urls, blogIndexContent, blogUrls);
        console.log(blogUrls)

      })
    }
    else if (blogUrls.length > 0) {
      newBlogUrl = blogUrls.pop();
      rp(newBlogUrl).then(function (html) {
        const buffer = fs.readFileSync('sup.html')
        html = buffer.toString()
        var $ = cheerio.load(html)
        console.log(newBlogUrl);
        /* SET BLOG CONTENT ITEMS HERE */
        const title = $("title", html).text();
        console.log(title)
        const seodesc = $("meta[name='description']", html).attr("content");
        const h1 = $("h1 .title", html).text(); //change based on the title of the blog post on the page
        let content = $(".post-content ", html).html();
        //set based on the content blog for the blog html on the page
        /* DOWNLOAD ALL IMAGES */
        $img = $.load(content);
        $img("img").each(function () {
          const img = $img(this).attr("src"); //change whether lazy loaded or not
          const newImgUrl = "/assets/img/blog/" + path.basename(img).trim();
          const newImgPath = __dirname + newImgUrl;
          download(img, newImgPath, function () { });
          $img(this).attr("src", newImgUrl);
        });
        // content = content.replace("data-src","src"); //do this if the images are lazy loaded
        WritePage(title, seodesc, h1, $img.html(), newBlogUrl);
        scrape(urls, blogIndexContent, blogUrls);
      })
    }
    else {
      WritePage("Blog", "", "Blog", blogIndexContent, "/blog/");
      console.log("we did it - we're heroes");
    }
  });
}
function WritePage(title, seodesc, h1, content, newBlogUrl) {
  let phpfile = `
  <?php
  $seotitle = "${title}";
  $seodesc = "${seodesc}";
  $section = "blog";
  ?>
  <?php include $_SERVER['DOCUMENT_ROOT'] . "/assets/inc/header.php" ?>
  <section class="masthead bg-image animate zoomOutBg" style="--bgImage: url(/assets/img/masthead/home.jpg);">
    <div class="container pv50">
      <div class="pv200">
        <h1 class="title-xl text-center mb10 white animate fadeIn">${h1}</h1>
      </div>
    </div>
  </section>
  <section class="mv100">
    <div class="container">
      <?php include $_SERVER['DOCUMENT_ROOT'] . "/assets/inc/logos.php" ?>
    </div>
  </section>
  <section class="mv100">
    <div class="container">
      <div class="mw1200">
        ${content}
      </div>
    </div>
  </section>
  <?php include $_SERVER['DOCUMENT_ROOT'] . "/assets/inc/request-consult.php" ?>
  <?php include $_SERVER['DOCUMENT_ROOT'] . "/assets/inc/footer.php" ?>
  <script>
  </script>`;
  shell.mkdir('-p', __dirname + newBlogUrl);
  const wstream = fs.createWriteStream(__dirname + newBlogUrl + '/index.php');
  wstream.write(phpfile);
  wstream.end();
}





























