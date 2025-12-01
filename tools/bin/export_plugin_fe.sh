#!/bin/bash

PLUGIN_NAME=$1
if [[ -z $PLUGIN_NAME ]];  then
    echo "no plugin name"
    exit 1
fi

PLUGIN_FOLDER="../plugins/"$PLUGIN_NAME 
if test ! -d $PLUGIN_FOLDER; then
    echo "plugin folder not found" $PLUGIN_FOLDER
    exit 1
fi

FE_FOLDER="../frontend/src/pages/plugin/"$PLUGIN_NAME
if test ! -d $PLUGIN_FOLDER; then
    echo "fe folder not found" $PLUGIN_FOLDER
    exit 1
fi

PLUGIN_FOLDER_FE=$PLUGIN_FOLDER"/frontend"
if test ! -d $PLUGIN_FOLDER; then
    echo "mkdir" $PLUGIN_FOLDER_FE
    mkdir $PLUGIN_FOLDER_FE
fi

echo "copied" $FE_FOLDER " -> " $PLUGIN_FOLDER_FE
cp $FE_FOLDER/* $PLUGIN_FOLDER_FE 
echo "ls -l" $PLUGIN_FOLDER_FE
ls -l $PLUGIN_FOLDER_FE