const fs = require('fs');
const AdmZip = require('adm-zip');

const zip = new AdmZip();
zip.addFile("my-app/index.html", Buffer.from("Hello"));
zip.addFile("my-app/js/app.js", Buffer.from("console.log(1)"));
zip.writeZip("test.zip");

const readZip = new AdmZip("test.zip");
let possibleIndexPaths = [];
for (const entry of readZip.getEntries()) {
    if (entry.isDirectory) continue;
    const parts = entry.entryName.split('/');
    const filename = parts[parts.length - 1];
    if (filename === 'index.html' || filename === 'index.htm') {
        possibleIndexPaths.push(entry.entryName);
    }
}
console.log(possibleIndexPaths);
