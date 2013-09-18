module Dashboard {


  export class FabricDashboardRepository implements DashboardRepository {

    private details;

    constructor(public workspace, public jolokia, public localStorage) {
      this.details = this.getBranchAndProfiles();
    }

    public getBranchAndProfiles() {

      var container = Fabric.getCurrentContainer(this.jolokia, ['id', 'versionId', 'profiles']);
      var profiles = [];
      if (container.profiles) {
        profiles = container.profiles.unique();
        profiles = Fabric.filterProfiles(this.jolokia, container.versionId, profiles);
      }

      return {
        branch: container.versionId,
        profiles: profiles
      }
    }

    public putDashboards(array:Dashboard[], commitMessage:string, fn) {
      var jolokia = this.jolokia;
      var details = this.details;
      array.forEach((dashboard) => {
        var data = angular.toJson(dashboard, true);
        var profileId = dashboard.profileId;
        if (!profileId) {
          // TODO maybe not just pick the first one :-)
          profileId = details.profiles.first();
        }
        var fileName = dashboard.fileName;
        if (!fileName) {
          fileName = Core.getUUID() + ".dashboard";
        }
        Fabric.saveConfigFile(jolokia, details.branch, profileId, fileName, data.encodeBase64(), () => {
          //notification('success', "Saved dashboard " + dashboard.title);
        }, (response) => {
          notification('error', "Failed to save dashboard " + dashboard.title + " due to " + response.error);
        });
      });
    }

    public deleteDashboards(array:Dashboard[], fn) {
      var jolokia = this.jolokia;
      var details = this.details;
      array.forEach((dashboard) => {
        var profileId = dashboard.profileId;
        var fileName = dashboard.fileName;
        if (profileId && fileName) {
          Fabric.deleteConfigFile(jolokia, details.branch, profileId, fileName, () => {
            notification('success', "Deleted dashboard " + dashboard.title);
          }, (response) => {
            notification('error', "Failed to delete dashboard " + dashboard.title + " due to " + response.error);
          })
        }
      });
    }

    public getDashboards(fn) {

      var jolokia = this.jolokia;
      var details = this.details;
      var dashboards = [];

      details.profiles.forEach((profile) => {
        var data = Fabric.getProfileData(jolokia, details.branch, profile, ['configurations']);
        data.configurations.forEach((configuration) => {
          if (configuration.endsWith(".dashboard")) {
            var file = Fabric.getConfigFile(jolokia, details.branch, profile, configuration);
            if (file) {
              var dashboard = angular.fromJson(file);
              dashboard['versionId'] = details.branch;
              dashboard['profileId'] = profile;
              dashboard['fileName'] = configuration;
              dashboards.push(dashboard);
            }
          }
        });
      });

      fn(dashboards);
    }

    public getDashboard(id:string, fn) {
      this.getDashboards((dashboards) => {
        dashboards.find((dashboard) => {
          if (dashboard.id === id) {
            fn(dashboard);
          }
        });
      });
    }
  }

}
