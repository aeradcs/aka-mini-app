// fill select form on nav-env window
window.onload = function () {
    let selector = document.getElementById("pathsSelector");
    for (let optionValue of options) {
        selector.options[selector.options.length] = new Option(optionValue, optionValue);
    }
}

// execute task remotely
async function runTask() {
    let button = document.getElementById("buttonRunTask")
    button.disabled = true

    // get values of selected items
    let fileNames = [...document.getElementById("pathsSelector").options]
        .filter(x => x.selected)
        .map(x => x.value);
    console.log("JS: fileNames " + fileNames)

    let pngsNames = document.getElementById("pngsNames");
    let spinner = document.getElementById("spinner");
    let modalLabel = document.getElementById("modalLabel");

    for (let fname of fileNames) {
        // change GUI to display job is running
        pngsNames.value = ""
        spinner.style.display = 'inline-block';
        modalLabel.textContent = `Началось выполнение задачи ${fileNames.indexOf(fname) + 1} на кластере`;

        await generatePythonScript(fname);
        console.log("JS: generatePythonScript done");

        // submit job on hpc
        await makeRequest("http://84.237.87.18:7710/jobs/", "POST", "")
        console.log("JS: submitJob done");

        // load results -- pngs names
        let response;
        await makeRequest("http://84.237.87.18:7710/jobs/0/", "GET", undefined).then((data) => {
            response = data;
            // change GUI to display job completing
            if (response !== undefined
                && response.split("\n")[1].split("|")[0] !== ""
                && compareInputAndOutputFiles(response.split("\n")[1].split("|")[0], fname)) {
                pngsNames.value = response.split("\n")[1].split("|")[0] + "|" + response.split("\n")[2].split("|")[0]
            } else {
                pngsNames.value = "Для этого файла не получилось построить изображения PSD"
            }
        });
        console.log("JS: loadImgNames done");

        // clear service context
        await makeRequest("http://84.237.87.18:7710/jobs/0/vars/", "DELETE", "");
        console.log("JS: clearVars done");

        // change GUI to display job completing
        spinner.style.display = 'none';
        modalLabel.textContent = `Задача ${fileNames.indexOf(fname) + 1} завершена`;
        await sleep(10000)
    }
    button.disabled = false
}

// compare .set and .png names -- if they are not equal, then task didn't complete successfully and images weren't built
function compareInputAndOutputFiles(pngOutputFile, setInputFile) {
    // retrieve .set path from .png name (images has name like "EO-Multitaper-PSD-gradiometers-," + path_to_set_file
    // and all spaces and slashes replaced with dashes and commas)
    pngOutputFile = pngOutputFile.replace(/EO-Multitaper-PSD-gradiometers-,/g, "")
        .replace(/EC-Multitaper-PSD-gradiometers-,/g, "")
        .replace(/-/g, " ")
        .replace(/,/g, "/")
        .replace(/.png/g, "");
    console.log(pngOutputFile);
    console.log(setInputFile);
    return setInputFile === pngOutputFile;
}

// generate .py to specific task
async function generatePythonScript(fname) {

    let path = "/home/fano.icmmg/gorodnichev_m_a/transfer/disk1/Milakhina/" + fname

    let varsUrl = "http://84.237.87.18:7710/jobs/0/vars/"
    let opsUrl = "http://84.237.87.18:7710/jobs/0/operations/"

    await makeRequest(varsUrl, 'POST', JSON.stringify({
        'varname': 'filename',
        'varvalue': path
    }));
    await makeRequest(varsUrl, 'POST', JSON.stringify({
        'varname': 'channels_to_drop',
        'varvalue': ["ECG", "EKG", "B1+"]
    }));
    await makeRequest(varsUrl, 'POST', JSON.stringify({
        'varname': 'ref_channel',
        'varvalue': "Cz"
    }));
    await makeRequest(opsUrl, 'POST', JSON.stringify({
        "modulename": "raw",
        "functionname": "read_raw_eeglab",
        "inputvars": [
            "filename"
        ],
        "outputvars": [
            "raw"
        ]
    }));
    await makeRequest(opsUrl, 'POST', JSON.stringify({
        "modulename": "channels",
        "functionname": "drop_channels",
        "inputvars": [
            "raw",
            "channels_to_drop"
        ],
        "outputvars": [
            "raw1"
        ]
    }));
    await makeRequest(opsUrl, 'POST', JSON.stringify({
        "modulename": "channels",
        "functionname": "add_reference_channel",
        "inputvars": [
            "raw1",
            "ref_channel"
        ],
        "outputvars": [
            "raw2"
        ]
    }));
    await makeRequest(opsUrl, 'POST', JSON.stringify({
        "modulename": "channels",
        "functionname": "set_eeg_reference",
        "inputvars": [
            "raw2"
        ],
        "outputvars": [
            "raw3"
        ]
    }));
    await makeRequest(opsUrl, 'POST', JSON.stringify({
        "modulename": "events",
        "functionname": "get_events",
        "inputvars": [
            "raw3"
        ],
        "outputvars": [
            "arrc",
            "arro"
        ]
    }));
    await makeRequest(opsUrl, 'POST', JSON.stringify({
        "modulename": "lobes",
        "functionname": "divide_on_lobes",
        "inputvars": [
            "raw3"
        ],
        "outputvars": [
            "lt",
            "rt",
            "lf",
            "rf",
            "lo",
            "ro",
            "lp",
            "rp"
        ]
    }));
    await makeRequest(opsUrl, 'POST', JSON.stringify({
        "modulename": "channels",
        "functionname": "combine_channels_mean",
        "inputvars": [
            "raw3",
            "lt",
            "rt",
            "lf",
            "rf",
            "lo",
            "ro",
            "lp",
            "rp"
        ],
        "outputvars": [
            "roi_raw"
        ]
    }));
    await makeRequest(opsUrl, 'POST', JSON.stringify({
        "modulename": "epoch",
        "functionname": "get_epochs",
        "inputvars": [
            "roi_raw",
            "arrc",
            "arro"
        ],
        "outputvars": [
            "epochsEC",
            "epochsEO"
        ]
    }));
    await makeRequest(opsUrl, 'POST', JSON.stringify({
        "modulename": "epoch",
        "functionname": "sum_signals",
        "inputvars": [
            "epochsEC",
            "epochsEO"
        ],
        "outputvars": [
            "ECpsds_mean0_av1_tot",
            "EOpsds_mean0_av1_tot",
            "ECpsds_mean0_av1_list",
            "EOpsds_mean0_av1_list",
            "ECpsds_mean0_av1_list_norm",
            "EOpsds_mean0_av1_list_norm"
        ]
    }));
    await makeRequest(opsUrl, 'POST', JSON.stringify({
        "modulename": "indexes",
        "functionname": "get_indexes",
        "inputvars": [
            "epochsEC",
            "epochsEO",
            "filename"
        ],
        "outputvars": [
            "indexes"
        ]
    }));

}

async function makeRequest(url, method, body) {
    if (body === undefined) {
        return await fetch(url, {
            method: method,
            headers: {

                'Content-Type': 'application/json'
            },
        }).then((response) => {
            return response.json().then((data) => {
                console.log("JS: makeRequest response \n" + data);
                return data;
            }).catch((err) => {
                console.log("JS: makeRequest error \n" + err);
            })
        });
    } else {
        return await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: body,
        }).then((response) => {
            return response.json().then((data) => {
                console.log("JS: makeRequest response \n" + data);
                return data;
            }).catch((err) => {
                console.log("JS: makeRequest error \n" + err);
            })
        });
    }
}

async function getPngRequest(pngName, htmlElemName) {
    fetch('http://84.237.87.18:7710/images/' + pngName)
        .then(res => {
            return res.blob()
        })
        .then(blob => {
            let img = URL.createObjectURL(blob);
            document.getElementById(htmlElemName).setAttribute('src', img);
            console.log("JS: getPngRequest done")
        })
}

async function showPsdImgs() {
    let pngsNames = document.getElementById("pngsNames").value.split("|")
    if (pngsNames[1] !== undefined) {
        getPngRequest(pngsNames[0], 'imagePsd')
        getPngRequest(pngsNames[1], 'imagePsd1')
        console.log("JS: showPsdImgs");
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// fill table on nav-results window
async function loadTab() {
    let table = document.getElementById("tableResults");

    // load path and dates of pngs from service
    let response;
    let paths = [];
    let dates = [];
    await makeRequest("http://84.237.87.18:7710/paths/", "GET", undefined).then((data) => {
        response = data.replace(/'/g, "\"");
        let obj = JSON.parse(response);
        console.log("JS: response " + response);
        if (response !== '{}') {
            Object.entries(obj).forEach(([key, value]) => {
                paths.push(key);
                dates.push(value);
            });

            // clear table to avoid duplicated rows
            $("#tableResults tr").remove();

            // create tbody
            paths.forEach((path, index) => {
                let tr = table.insertRow();
                tr.setAttribute('data-href', '')
                addCell(tr, path)
                addCell(tr, dates[index]);
            });

            // create thead
            let tHead = table.createTHead();
            let trHead = tHead.insertRow();
            trHead.setAttribute('class', 'table-secondary')
            addColName(trHead, "Путь к файлу");
            addColName(trHead, "Дата обработки");
        } else {
            alert("Результатов еще нет.\nПерейдите на экран \"Рабочая среда\", выберите файл и поставьте задачу.\nПосле выполнения результаты появятся здесь.")
        }
    });
}

//add cell to body row
function addCell(tr, text) {
    let tc = tr.insertCell();
    let td = document.createTextNode(text);
    tc.appendChild(td);
}

//add cell to head row
function addColName(trHead, text) {
    let th = document.createElement('th');
    trHead.appendChild(th);
    let data = document.createTextNode(text);
    th.appendChild(data);
}

// listen to table row click to display images
$(document).ready(function () {
    $(document.body).on("click", "tr[data-href]", function () {
        // get clicked path from table
        let path = this.firstElementChild.textContent
        console.log("JS: path " + path)

        document.getElementById("imgSaved").src = ""
        document.getElementById("imgSaved1").src = ""
        getPngRequest("EO-Multitaper-PSD-gradiometers-," + path.replace(/\//g, ",").replace(/ /g, "-") + ".png", 'imgSaved')
        getPngRequest("EC-Multitaper-PSD-gradiometers-," + path.replace(/\//g, ",").replace(/ /g, "-") + ".png", 'imgSaved1')
    })
})




