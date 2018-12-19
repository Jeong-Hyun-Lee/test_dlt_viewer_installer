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
    distPath: 'dist/',
    distPackageRootPath: 'dist/package-root/',
    configPath: 'dist/package-root/config/',
    packageDataPath: 'dist/package-root/packages/dlt_viewer/data/',
    packageMetaPath: 'dist/package-root/packages/dlt_viewer/meta/',
    templatePath: 'template/',
    resourcePath: function () {
      if (process.platform === 'win32') {
        return 'resource/win/';
      } else if (process.platform === 'darwin') {
        return 'resource/darwin/'
      } else {
        return 'resource/linux/';
      }
    }(),
    installerPath: 'installer/',
    resultPath: path.join('build_result', process.platform)
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
        paths.resultPath,
        paths.distPath
      ]
    },
		mkdir: {
		  all: {
		    options: {
		      create: [path.join(paths.resourcePath, 'data')]
		    }
		  }
		},
    copy: {
      qt: {
        files: [
          {
            expand: true,
            cwd: paths.installerPath,
            src: ['**/**'],
            dest: paths.distPath
          },
          {
            expand: true,
            cwd: paths.templatePath,
            src: ['project-template.dlp'],
            dest: paths.packageDataPath
          },
          {
            expand: true,
            cwd: process.platform === 'linux' ? path.join(paths.resourcePath, 'data/dlt-viewer/build/release') : path.join(paths.resourcePath, 'data'),
            src:  ['**/*'],
            dest: paths.packageDataPath
          },
          {
            expand: true,
            cwd: paths.resourcePath,
            src: process.platform === 'win32' ? ['installer_build.bat', 'installer_codesign.bat', 'binarycreator.exe', 'installerbase.exe'] : ['binarycreator', 'installerbase', 'installer_build.sh'],
            dest: paths.distPackageRootPath
          }
        ]
      },
      dltDaemon: {
        files: [
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
        mode: '755'
      },
      buildScript: {
        // Target-specific file/dir lists and/or options go here.
        src: [
          path.join(paths.distPackageRootPath, '**/*')
        ]
      }
    },
    execute: {
      findDependency: {
        call: function (grunt, options, async) {
          var done = async();
          exec('./linuxdeployqt-continuous-x86_64.AppImage ' + paths.packageDataPath + 'dlt_viewer', {cwd : paths.root}, function(err){
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
          } else if (process.platform === 'darwin') {
            addData.targetpath = '/Applications/DLT Viewer';
						addData.wizardwidth = '400';
						addData.wizardheight = '300';
					} else if (process.platform === 'linux') {
						addData.targetpath = '/opt/DLT Viewer';
						addData.wizardwidth = '400';
						addData.wizardheight = '300';
					}

          var xmlFile = fs.readFileSync(path.join(paths.configPath, 'config.xml'), 'utf-8');
          var compiled = _.template(xmlFile);
          var addDataXmlFile = compiled(addData);
          fs.outputFileSync(path.join(paths.configPath, 'config.xml'), addDataXmlFile);

          xmlFile = fs.readFileSync(path.join(paths.packageMetaPath, 'package.xml'), 'utf-8');
          compiled = _.template(xmlFile);
          addDataXmlFile = compiled({ releasedate : moment().format("YYYY-MM-DD") });
          fs.outputFileSync(path.join(paths.packageMetaPath, 'package.xml'), addDataXmlFile);
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
          } else if (process.platform === 'darwin') {
            fileName = fileName + '.app';
          } else {
            fileName = fileName + '.run';
          }

          buildResultPath = path.join(paths.resultPath, fileName);

          var srcPath = path.join(paths.distPackageRootPath, fileName);
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
            cwd : paths.distPackageRootPath
          }
        }
      },
      codeSign: {
        command: 'installer_codesign.bat',
        options:{
          async : false,
          execOptions:{
            cwd : paths.distPackageRootPath
          }
        }
      },
      unixBuild: {
        command: './installer_build.sh',
        options:{
          async : false,
          execOptions:{
            cwd : paths.distPackageRootPath
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

  /**
   * 라이센스 문제로 인하여 각 OS별로 installerBase와 binarycreator 파일을
   * paths.resourcePath에 위치시켜야 한다.
   */
  grunt.registerTask('win', [
    'clean:qtData',
    'copy:qt',
    'execute:addData',
    'shell:windowBuild',
    'shell:codeSign',
    'execute:moveInstaller'
  ]);

  grunt.registerTask('linux', [
    'clean:qtData',
    'mkdir:all',
    'shell:cloneDltViewer',
    'copy:qt',
    'copy:dltDaemon',
    'chmod:buildScript',
    'execute:findDependency',
    'execute:addData',
    'shell:unixBuild',
    'execute:moveInstaller'
  ]);

  grunt.registerTask('mac', [
    'clean:qtData',
    'copy:qt',
    'chmod:buildScript',
    'execute:addData',
    'shell:unixBuild',
    'execute:moveInstaller'
  ]);
};
