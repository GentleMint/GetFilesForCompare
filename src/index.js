/**
 * NOTE: use node v11 !!
 * 
 * 
 * Scan file in the specified scanDir;
 * For all the files under it, find it recursively in srcDir;
 * Copy it into tgtDir, with the same folder tree as scanDir;
 * 
 * tgtDir should be changed to use a subfolder named with <datetime>_compare
 */

const config = require('./config.js');
const fs = require('fs');
const path = require('path');
const P = require('util').promisify;

const glob = P(require('glob'));

/**
 * Create <datetime>_compare folder under config.tgtDir and return the new dir.
 * Return null if failed to create subfolder.
 */
function getTgtFolder() {
    let tgtDir = config.tgtDir;

    if (!fs.existsSync(tgtDir)) {
        console.log(`ERROR: tgtDir ${tgtDir} does not exist`);
        return;
    }

    let stat = fs.statSync(tgtDir);
    if (!stat.isDirectory()) {
        console.log(`ERROR: tgtDir ${tgtDir} is not a folder`);
        return;
    }

    let dirName = String(new Date().getTime()) + '_compare';
    tgtDir = path.join(tgtDir, dirName);
    try {
        fs.mkdirSync(tgtDir);
    } catch (e) {
        console.log(e);
        console.log(`Failed to create dir ${tgtDir}`);
        return;
    }

    console.log(`INFO: create tgtDir ${tgtDir}`);
    return tgtDir;
}

async function scanFiles() {
    let res;

    try {
        let realDir = fs.realpathSync(config.scanDir);

        res = {};
        res.scanDir = realDir;

        let globPattern = realDir + path.sep + config.scanPattern;
        let files = await glob(globPattern);
        res.files = files;
    } catch (e) {
        console.log(e);
    }

    //console.log(res);

    return res;
}

function getSubDirAndName(scanRes) {
    if (!scanRes || !scanRes.files) {
        return;
    }

    let {
        files,
        scanDir
    } = scanRes;
    let res = [];

    if (files) {
        files.forEach(function (file) {
            let subRes = {
                scanedFile: file
            };

            let parts = file.split(scanDir).pop().split(path.sep);

            subRes.fileName = parts.pop();
            subRes.midPath = parts.join(path.sep);

            res.push(subRes);
        })
    }

    //console.log(res);
    return res;
}

async function addSrcFile(oriRes) {
    if (!oriRes) {
        return;
    }

    let srcDir = config.srcDir;
    // find the fileName in srcDir
    for (let item of oriRes) {
        let fileName = item.fileName;
        let srcFile = await glob(srcDir + '/**/' + fileName);
        if ((srcFile || []).length > 0) {
            srcFile = srcFile[0];
            item.srcFile = srcFile; // add srcFile
        }
    }

    // console.log(oriRes);
    return oriRes;
}

function addTgtFile(oriRes) {
    if (!oriRes) {
        return;
    }

    let tgtDir = getTgtFolder();

    for (let item of oriRes) {
        let fullTgtDir = path.join(tgtDir, item.midPath);
        fs.mkdirSync(fullTgtDir, {
            recursive: true
        });

        item.tgtFile = path.join(fullTgtDir, item.fileName);
    }

    // console.log(oriRes);

    return oriRes;
}

function copyFiles(oriRes) {
    if (!oriRes) {
        return;
    }

    for (let item of oriRes) {
        fs.copyFileSync(item.srcFile, item.tgtFile);
    }
}

async function main() {
    copyFiles(addTgtFile(await addSrcFile(getSubDirAndName(await scanFiles()))));
}

main();