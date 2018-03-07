#!/bin/bash

GIT_REPOSITORY_HTTPS="git clone https://github.com/GENIVI/dlt-viewer.git"
GIT_REPOSITORY_SSH="git clone git://git.projects.genivi.org/dlt-viewer.git"
DLT_VIEWER_PATH=$PWD"/dlt-viewer"

function pathExists() {    
    path=$1
    echo "path is "$path
    if [ -d "$path" ];then
        return 0    
    else 
        return 1
    fi
}

function gitCloneDltViewer() {
    pathExists $DLT_VIEWER_PATH
    existsResult=$?
    echo $existsResult
  
    if [ $existsResult -eq 0 ];then
        echo "exist dlt viewer"
        return 0;    
    fi

    $GIT_REPOSITORY_HTTPS
    if [ $? -eq 0 ];then
        echo "Success -> https git clone"
        return 0
    else
        echo "Fail -> https git clone"
        echo "Retry -> git clone with ssh address"    
        
        $GIT_REPOSITORY_SSH
        if [ $? -eq 0 ];then
            echo " Success -> ssh git clone"
            
        else
            echo "Fail -> ssh git clone"
            return 1
        fi
    fi    
}

function makeViewer() {
    cd $DLT_VIEWER_PATH
    mkdir build && cd build
    qmake ../BuildDltViewer.pro
    make
}

function init() {
    gitCloneDltViewer
    result=$?
    if [ $result -eq 0 ]; then
        makeViewer
    fi
}

init

exit 0

