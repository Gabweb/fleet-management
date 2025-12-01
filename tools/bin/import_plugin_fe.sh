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
    echo "plugin fe folder not found" $PLUGIN_FOLDER_FE
    exit 1
fi

cp -a $PLUGIN_FOLDER_FE/* $FE_FOLDER
echo "copied" $PLUGIN_FOLDER_FE " -> " $FE_FOLDER 
echo "ls -l" $FE_FOLDER
ls -l $FE_FOLDER