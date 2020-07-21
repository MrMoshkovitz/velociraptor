'use strict';

goog.module('grrUi.client.shellViewerDirective');

var OPERATION_POLL_INTERVAL_MS = 2000;

const ShellViewerController = function(
    $scope, $interval, grrApiService) {
    var self = this;

    /** @private {!angular.Scope} */
    this.scope_ = $scope;

    /** @private {!angular.$interval} */
    this.interval_ = $interval;

    this.type = "Powershell";

    /** @private {!grrUi.core.apiService.ApiService} */
    this.grrApiService_ = grrApiService;

    this.scope_.$watch('clientId', this.onClientIdChange_.bind(this));

    this.clientId;

    this.flows = [];

    this.focus = true;
    this.input = "";

    this.flowOperationInterval_ = this.interval_(
        this.fetchLastShellCollections.bind(this),
        OPERATION_POLL_INTERVAL_MS);

    this.scope_.$on('$destroy', function() {
        self.interval_.cancel(self.flowOperationInterval_);
    });
};

// Launch the flow on the endpoint.
ShellViewerController.prototype.launchCommand = function() {
    var artifact = "";
    if (this.type == "Powershell") {
        artifact = "Windows.System.PowerShell";
    } else if(this.type == "Cmd") {
        artifact = "Windows.System.CmdShell";
    } else if(this.type == "Base") {
        artifact = "Linux.Sys.BashShell";
    } else {
        return;
    };

    var params = {
        client_id: this.clientId,
        artifacts: [artifact],
        parameters: {
            env: [{key: "Command", value: this.input}],
        },
    };

    this.grrApiService_.post('v1/CollectArtifact', params).then(
            function success(response) {},
            function failure(response) {
                this.responseError = response['data']['error'] || 'Unknown error';
            });
};

ShellViewerController.prototype.setType = function(type, e) {
    this.type = type;
    this.focus = type;
    return false;
};

ShellViewerController.prototype.onClientIdChange_ = function(clientId) {
  if (angular.isDefined(clientId)) {
    this.clientId = clientId;
    this.fetchLastShellCollections();
  }
};

ShellViewerController.prototype.fetchLastShellCollections = function() {
    var url = '/v1/GetClientFlows/' + this.clientId;
    var self = this;

    self.grrApiService_.get(url, {count: 100, offset: 0}).then(
        function(response) {
            self.flows = [];
            var items = response.data.items;
            for(var i=0; i<items.length; i++) {
                var artifact = items[i].artifacts_with_results[0];
                if (artifact == "Windows.System.PowerShell" ||
                    artifact == "Windows.System.CmdShell") {
                    self.flows.push(items[i]);
                }
            };
        });

    return false;
};

exports.ShellViewerDirective = function() {
  return {
    scope: {
      'clientId': '='
    },
    restrict: 'E',
    templateUrl: '/static/angular-components/client/shell-viewer.html',
    controller: ShellViewerController,
    controllerAs: 'controller'
  };
};

exports.ShellViewerDirective.directive_name = 'grrShellViewer';
