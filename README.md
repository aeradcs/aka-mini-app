# aka-mini-app install

1.      git clone https://gitlab.ssd.sscc.ru/e.nalepova/aka-mini-app.git 
2.      cd aka-mini-app
3.      В файле app.js нужно поменять ip-адрес и порт 84.237.87.18:7710 на ip-адрес и порт, на котором у вас работает сервис выполнения операций.
3.      открыть app.html
    Если возникает ошибка “_Access has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource._”   при попытке сделать что-либо на странице, то для решения проблемы можно выполнить команду (подходит для windows 10):

        chrome.exe --user-data-dir="C://Chrome dev session" --disable-web-security
    
    и открыть страницу app.html в появившемся окне.

    Для linux, возможно, подойдет команда (https://stackoverflow.com/a/6083677/16936774):

        google-chrome --disable-web-security

   


