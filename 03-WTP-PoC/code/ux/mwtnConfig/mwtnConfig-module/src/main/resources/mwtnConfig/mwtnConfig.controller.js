/*
 * Copyright (c) 2016 highstreet technologies GmbH and others. All rights reserved.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution,
 * and is available at http://www.eclipse.org/legal/epl-v10.html
 */

define(['app/mwtnConfig/mwtnConfig.module',
        'app/mwtnConfig/mwtnConfig.services', 
        'app/mwtnConfig/mwtnConfig.directives', 
        'app/mwtnCommons/mwtnCommons.module',
        'app/mwtnCommons/bower_components/angular-ui-grid/ui-grid.min', 
        'app/mwtnCommons/bower_components/angular-bootstrap/ui-bootstrap-tpls.min'], function(mwtnConfigApp) {

  mwtnConfigApp.register.controller('mwtnConfigCtrl', ['$scope', '$rootScope', '$mwtnCommons', '$mwtnLog', '$mwtnConnect', '$mwtnConfig', function($scope, $rootScope, $mwtnCommons, $mwtnLog, $mwtnConnect, $mwtnConfig) {

    var COMPONENT = 'mwtnConfigCtrl';
    $mwtnLog.info({component: COMPONENT, message: 'mwtnConfigCtrl started!'});

    $rootScope['section_logo'] = 'src/app/mwtnConfig/images/mwtnConfig.png'; // Add your topbar logo location here such as 'assets/images/logo_topology.gif'

    $scope.isArray = angular.isArray;
    $scope.isString = angular.isString;
    $scope.details = ['Capability', 'Configuration', 'Status', 'CurrentProblems', 'CurrentPerformance', 'HistoricalPerformances']
    var initPac = {
        layerProtocol: 'unknown'              
    };
    $scope.details.map(function(detail){
      initPac[detail] = {info: 'Not supported by ONF Microwave Model revision: 2016-03-23'};
    });

    $scope.schema = {init:false};
    $mwtnCommons.getSchema(function(data){
      // console.log(data);
      $scope.schema = data;
    });
    
    $scope.getUnit = $mwtnCommons.getUnit;
    $scope.getTest = function(key, value) {
      console.log(key, value);
      return key;
    };
    
    $mwtnConnect.getActualNetworkElements(function(networkElements) {
      $scope.networkElements = [];
      networkElements.topology.map(function(topology) {
        if (topology['topology-id'] === 'topology-netconf') {
          topology.node.map(function(ne) {
            if (ne['netconf-node-topology:connection-status'] === 'connected' && ne['netconf-node-topology:available-capabilities'] && ne['netconf-node-topology:available-capabilities']['available-capability']) {
              ne['netconf-node-topology:available-capabilities']['available-capability'].map(function(cap){
                if (cap.contains('CoreModel-CoreNetworkModule-ObjectClasses')) {
                  ne.onfCoreModelRevision = cap.split('?revision=')[1].substring(0,10);
                } else if (cap.contains('MicrowaveModel-ObjectClasses')) {
                  ne.onfAirIinterfaceRevision = cap.split('?revision=')[1].substring(0,10);
                }
              });
              if (ne.onfAirIinterfaceRevision) {
                $scope.networkElements.push({id:ne['node-id'], revision:ne.onfAirIinterfaceRevision});
              }
            }
          });
          $scope.networkElements.sort(function(a, b){
            if(a.id < b.id) return -1;
            if(a.id > b.id) return 1;
            return 0;
          });
          
          // select one of the nodes
          var select = parseInt(Math.random()*$scope.networkElements.length);
          $scope.networkElement = $scope.networkElements[select].id;
        }
      });
    });
    
    var order = {
        'MWPS':1,
        'MWS':2,
        'ETH-CTP':3
    }
    var updateNe = function(data) {
      if (!data) return;

      // update onfNetworkElement
      $scope.onfNetworkElement = JSON.parse(JSON.stringify(data.NetworkElement[0]));
      $scope.onfNetworkElement._ltpRefList = undefined;
      
      // update onfLTPs
      $scope.onfLtps = data.NetworkElement[0]._ltpRefList;
      $scope.onfLtps.sort(function(a, b){
        if(order[a._lpList[0].layerProtocolName] < order[b._lpList[0].layerProtocolName]) return -1;
        if(order[a._lpList[0].layerProtocolName] > order[b._lpList[0].layerProtocolName]) return 1;
        if(a._lpList[0].uuid < b._lpList[0].uuid) return -1;
        if(a._lpList[0].uuid > b._lpList[0].uuid) return 1;
        return 0;
      });
      
      // calculate conditional packages
      $scope.airinterfaces = [];
      $scope.structures = [];
      $scope.containers = [];
      $scope.onfLtps.map(function(ltp){
        var lpId = ltp._lpList[0].uuid;
        switch (ltp._lpList[0].layerProtocolName) {
          case "MWPS":
            var init = JSON.parse(JSON.stringify(initPac));
            init.layerProtocol = lpId;
            $scope.airinterfaces.push(init);
            break;
          case "MWS":
            var init = JSON.parse(JSON.stringify(initPac));
            init.layerProtocol = lpId;
            $scope.structures.push(init);
            break;
          case "ETH-CTP":
            var init = JSON.parse(JSON.stringify(initPac));
            init.layerProtocol = lpId;
            $scope.containers.push(init);
            break;
          default:
            $mwtnLog.info({component: COMPONENT, message: 'The layerProtocol ' + ltp._lpList[0].layerProtocolName + ' is not supported (yet)!'});
        }
      });
      
      // sort the groups
      ['airinterfaces', 'structures', 'containers'].map(function(pacs){
        $scope[pacs].sort(function(a, b){
          if(a.layerProtocol < b.layerProtocol) return -1;
          if(a.layerProtocol > b.layerProtocol) return 1;
          return 0;
        });
      });
      
    };

    var updateLtp = function(data) {
      $scope.onfLtps.map(function(ltp){
        if (ltp.uuid === data.data._ltpRefList[0].uuid) {
          ltp = data.data._ltpRefList[0];
        }
      });
    };

    var updateAirInterface = function(lpId, part, data) {
      // console.log(JSON.stringify(data), lpId);
      $scope.airinterfaces.map(function(airinterface){
        // console.log(JSON.stringify(airinterface));
        if (airinterface.layerProtocol === lpId) {
          if (Object.keys(data)[0].startsWith('airInterface')) {
            airinterface[part] = data;            
          } else if (part === 'Capability') {
            // 2. PoC
            // console.log(part, JSON.stringify(data));
            airinterface[part] = data.MW_AirInterface_Pac[0].airInterfaceCapabilityList;            
          } else if (part === 'CurrentProblems') {
            // 2. PoC
            // console.log(part, JSON.stringify(data));
            airinterface[part] = data.MW_AirInterface_Pac[0].airInterfaceCurrentProblemList;            
          }
        }
      });
    };

    var updateStructure = function(lpId, data) {
      // console.log(JSON.stringify(data), lpId);
      $scope.structures.map(function(structure){
        // console.log(JSON.stringify(structure));
        if (structure.layerProtocol === lpId) {
          var part = Object.keys(data)[0].substring('structure'.length);
          // console.log(part);
          structure[part] = data;
        }
      });
    };

    var updateContainer = function(lpId, data) {
      console.log(JSON.stringify(data), lpId);
      $scope.containers.map(function(container){
        // console.log(JSON.stringify(container));
        if (container.layerProtocol === lpId) {
          var part = Object.keys(data)[0].substring('container'.length);
          // console.log(part);
          container[part] = data;
        }
      });
    };

    // events
    $scope.status = {};
    $scope.separator = $mwtnCommons.separator; //'&nbsp;'
    $scope.$watch('status', function(status, oldValue) {
      Object.keys(status).map(function(key){
        if ($scope.networkElementId && status[key] && status[key] !== oldValue[key]) {
          // console.log('getdata by status change', $scope.networkElementId, key);
          $mwtnConfig.getData($scope.networkElementId, $scope.revision, key, function(data){
            if (data) {
              var info = key.split($scope.separator);
              switch (info[0]) {
              case 'ne':
                updateNe(data);
                break;
              case 'ltp':
                updateLtp(data);
                break;
              case 'airinterface':
                updateAirInterface(info[1], info[2], data);
                break;
              case 'structure':
                updateStructure(info[1], data);
                break;
              case 'container':
                updateContainer(info[1], data);
                break;
              }
            }            
          }); 
        }
      });   
    }, true);
    
    $scope.collapseAll = function() {
      // close all groups
      Object.keys($scope.status).map(function(group){
        $scope.status[group] = false;
      });
    };
    
    $scope.$watch('networkElement', function(neId, oldValue) {
      if (neId && neId !== '' && neId !== oldValue) {
        var revision;
        $scope.networkElements.map(function(ne){
          if (ne.id === neId) revision = ne.revision;
        });
        $scope.networkElementId = neId;
        $scope.revision = revision;
        // console.log('getdata by ne change', neId, revision);
        $mwtnConfig.getData(neId, revision, 'ne', function(data){
          $scope.collapseAll();
          updateNe(data);
        }); 
      }
    });

  }]);

});
