/*
 * Copyright (c) 2013 - present Adobe Systems Incorporated. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */
/*global module, require*/

module.exports = function (grunt) {
  'use strict';

  var _ = require('lodash'),
    fs = require('fs-extra'),
    path = require('path'),
    moment = require('moment'),
    exec = require('child_process').exec;

  var paths = {
    root: process.cwd(),
    packageDataPath: 'installer/packages/dlt_viewer/data/',
    packageXmlPath: 'installer/packages/dlt_viewer/meta/',
    configXmlPath: 'installer/config/',
    templatePath: 'template/',
    resourcePath: function () {
      if (process.platform == 'win32') {
        return 'resource/win/';
      } else {
        return 'resource/linux/';
      }
    }(),
    installerPath: 'installer/',
    resultPath: 'build_result/'
  };

  // load dependencies
  require('load-grunt-tasks')(grunt, {
    pattern: [
      'grunt-*',
      '!grunt-cli',
      '!grunt-lib-phantomjs',
      '!grunt-template-jasmine-requirejs'
    ]
  });

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: {
      qtData: [
        paths.packageDataPath,
        paths.resultPath,
        path.join(paths.configXmlPath, 'config.xml'),
        // for Windows
        path.join(paths.installerPath, '/*.bat'),
        path.join(paths.installerPath, '/*.exe'),
        // for Linux
        path.join(paths.installerPath, '/*.sh'),
        path.join(paths.installerPath, '/binarycreator'),
        path.join(paths.installerPath, '/installerbase')
      ]
    },
    copy: {
      qt: {
        files: [
          {
            expand: true,
            cwd: paths.templatePath,
            src: 'package.xml',
            dest: paths.packageXmlPath
          },
          {
            expand: true,
            cwd: paths.templatePath,
            src: ['config.xml'],
            dest: paths.configXmlPath
          },
          {
            expand: true,
            cwd: paths.templatePath,
            src: ['project-template.dlp'],
            dest: paths.packageDataPath
          },
          {
            expand: true,
            cwd: process.platform === 'win32' ? path.join(paths.resourcePath, 'data') : path.join(paths.resourcePath, 'data/dlt-viewer/build/release'),
            src:  ['**/*'],
            dest: paths.packageDataPath
          },
          {
            expand: true,
            cwd: paths.resourcePath,
            src: process.platform === 'win32' ? ['installer_build.bat', 'installer_codesign.bat', 'binarycreator.exe', 'installerbase.exe'] : ['binarycreator', 'installerbase', 'installer_build.sh'],
            dest: paths.installerPath
          },
          {
            expand: true,
            cwd: paths.resourcePath,
            src: ['dlt-daemon'],
            dest: paths.packageDataPath
          }
        ]
      }
    },
    chmod: {
      options: {
        mode: '777'
      },
      linuxBuild: {
        // Target-specific file/dir lists and/or options go here.
        src: ['installer/**/*']
      }
    },
    execute: {
      findDependency: {
        call: function (grunt, options, async) {
          var done = async();
          exec('./linuxdeployqt-continuous-x86_64.AppImage '+ paths.packageDataPath + 'dlt_viewer', {cwd : paths.root}, function(err){
            if(err)
              throw new Error('error not find dependency ');
            done();
          });

        }
      },
      addData: {
        call: function (grunt, options, async) {
          var done = async();
					var addData = {};

					if (process.platform === 'win32') {
						addData.targetpath = 'C:/Program Files (x86)/DLT Viewer';
						addData.wizardwidth = '580';
						addData.wizardheight = '440';
					} else if (process.platform === 'linux') {
						addData.targetpath = '/opt/DLT Viewer';
						addData.wizardwidth = '400';
						addData.wizardheight = '300';
					}

          var xmlFile = fs.readFileSync(path.join(paths.configXmlPath, 'config.xml'), 'utf-8');
          var compiled = _.template(xmlFile);
          var addDataXmlFile = compiled(addData);
          fs.outputFileSync(path.join(paths.configXmlPath, 'config.xml'), addDataXmlFile);

          xmlFile = fs.readFileSync(path.join(paths.packageXmlPath, 'package.xml'), 'utf-8');
          compiled = _.template(xmlFile);
          addDataXmlFile = compiled({ releasedate : moment().format("YYYY-MM-DD") });
          fs.outputFileSync(path.join(paths.packageXmlPath, 'package.xml'), addDataXmlFile);
          done();
        }
      },
      moveInstaller: {
        call: function (grunt, options, async) {
          var done = async();
          var fileName = 'setup';
          var buildResultPath;

          if (process.platform === 'win32') {
            fileName = fileName + '.exe';
            buildResultPath = 'build_result/win/' + fileName;
          } else {
            fileName = fileName + '.run';
            buildResultPath = 'build_result/linux/' + fileName;
          }

          var srcPath = path.join(paths.installerPath, fileName);
          var destPath = path.join(paths.root, buildResultPath);

          fs.move(srcPath, destPath, function (err) {
            if (err) {
              return console.log('Fail installer move >> ' + err);
            }

            console.log('Success installer move');
            done();
          });
        }
      }
    },
    shell: {
      windowBuild: {
        command: 'installer_build.bat',
        options:{
          async : false,
          execOptions:{
            cwd : paths.installerPath
          }
        }
      },
      codeSign: {
        command: 'installer_codesign.bat',
        options:{
          async : false,
          execOptions:{
            cwd : paths.installerPath
          }
        }
      },
      linuxBuild: {
        command: './installer_build.sh',
        options:{
          async : false,
          execOptions:{
            cwd : paths.installerPath
          }
        }
      },
      cloneDltViewer: {
        command: '../clone_dlt_viewer.sh',
        options:{
          async : false,
          execOptions:{
            cwd : path.join(paths.resourcePath, 'data')
          }
        }
      }
    }
  });

  grunt.registerTask('win', [
    'clean:qtData',
    'copy:qt',
    'execute:addData',
    'shell:windowBuild',
    'execute:moveInstaller'
  ]);

  grunt.registerTask('linux', [
    'clean:qtData',
    'shell:cloneDltViewer',
    'copy:qt',
    'execute:findDependency',
    'execute:addData',
    'chmod:linuxBuild',
    'shell:linuxBuild',
    'execute:moveInstaller'
  ]);
};
