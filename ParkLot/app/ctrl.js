app.controller('ParkingLotController', ['$scope', '$timeout', '$http', function ($scope, $timeout, $http) {
    $scope.data = { source: {}, boundaries: {}, maxPeriods: { count: 0, intervals: [], dates: [] } };
    $scope.main = { apiUrl: "http://parkingapi.gear.host/v1/parking" };

    $scope.func = {
        findBoundaries: function (intervals) {
            if (!intervals.length) return;
            var startDate = new Date(intervals[0].arrivalTime);
            var finishDate = new Date(intervals[0].leaveTime);
            for (var i = 0; i < intervals.length; i++) {
                var startInterval = new Date(intervals[i].arrivalTime);
                var finishInterval = new Date(intervals[i].leaveTime);
                if (startInterval < startDate) startDate = startInterval;
                if (finishInterval > finishDate) finishDate = finishInterval;
            }

            $scope.filter.fromDate = startDate;
            $scope.filter.fromHour = startDate.getHours();
            $scope.filter.fromMinute = startDate.getMinutes();
            $scope.filter.toDate = finishDate;
            $scope.filter.toHour = finishDate.getHours();
            $scope.filter.toMinute = finishDate.getMinutes();
            $scope.data.boundaries.startDate = $scope.dateOptions.minDate = startDate;
            $scope.data.boundaries.finishDate = $scope.dateOptions.maxDate = finishDate;
        },
        normalize: function (intervals, boundaries) {
            var normalizedData = new Array((boundaries.finishDate - boundaries.startDate) / 60000 + 1);
            $scope.data.maxPeriods = { count: 0, intervals: [], dates: [] };
            //var startDateMinutesFormDayStart = boundaries.startDate.getMinutes() % 1440;

            for (var i = 0; i < intervals.length; i++) {
                var startInterval = new Date(intervals[i].arrivalTime);
                var finishInterval = new Date(intervals[i].leaveTime);
                var startIndex = (startInterval - boundaries.startDate) / 60000;
                var finishIndex = (finishInterval - boundaries.startDate) / 60000;
                for (var j = startIndex; j <= finishIndex; j++) {
                    normalizedData[j] = normalizedData[j] + 1 || 1;
                    //var minuteNumDuringTheDay = (j + startDateMinutesFormDayStart) % 1440;
                    //$scope.data.carsDuringDay[minuteNumDuringTheDay] = $scope.data.carsDuringDay[minuteNumDuringTheDay] + 1 || 1;

                    if ($scope.data.maxPeriods.count < normalizedData[j]) {
                        $scope.data.maxPeriods.count = normalizedData[j];
                        $scope.data.maxPeriods.intervals = [];
                        $scope.data.maxPeriods.intervals.push(j);
                    }
                    else if ($scope.data.maxPeriods.count == normalizedData[j]) {
                        $scope.data.maxPeriods.intervals.push(j);
                    }
                }
            }

            $scope.func.getMaxPeriods(boundaries.startDate);
            return { data: normalizedData }
        },
        getMaxPeriods: function (fromDate) {
            $scope.data.maxPeriods.dates = [];
            var i = 0;
            while (i < $scope.data.maxPeriods.intervals.length) {
                if(i == $scope.data.maxPeriods.intervals.length - 1){
                    $scope.data.maxPeriods.dates.push($scope.func.formatDate(new Date(fromDate.getTime() + $scope.data.maxPeriods.intervals[i] * 60000)));
                    break;
                }

                if($scope.data.maxPeriods.intervals[i+1] - $scope.data.maxPeriods.intervals[i] > 1){
                    $scope.data.maxPeriods.dates.push(new Date(fromDate.getTime() + $scope.data.maxPeriods.intervals[i] * 60000));
                }
                else{
                    var j = i;
                    while($scope.data.maxPeriods.intervals[j+1] - $scope.data.maxPeriods.intervals[j] == 1){
                        j++;
                    }

                    $scope.data.maxPeriods.dates.push($scope.func.formatDate(new Date(fromDate.getTime() + $scope.data.maxPeriods.intervals[i] * 60000)) + " - " + $scope.func.formatDate(new Date(fromDate.getTime() + $scope.data.maxPeriods.intervals[j] * 60000)));
                    i = j;
                }

                i++;
            }
        },        
        getData: function () {
            $http({
                method: 'GET',
                url: '/api/data?sourceUrl=' + $scope.main.apiUrl,
            }).then(function successCallback(response) {
                $scope.func.findBoundaries(response.data);
                var dataAfterNormalization = $scope.func.normalize(response.data, $scope.data.boundaries);

                $scope.data.source = dataAfterNormalization.data;

                $scope.func.buildChart($scope.data.source, $scope.data.boundaries.startDate, $scope.data.boundaries.finishDate);
            }, function errorCallback(response) {
                console.log(response);
            });
        },
        getFilterDates: function (){
            var startDate = angular.copy($scope.filter.fromDate);
            startDate.setHours($scope.filter.fromHour);
            startDate.setMinutes($scope.filter.fromMinute);
            var finishDate = angular.copy($scope.filter.toDate);
            finishDate.setHours($scope.filter.toHour);
            finishDate.setMinutes($scope.filter.toMinute);
            return {startDate: startDate, finishDate: finishDate};
        },
        filter: function () {
            var filterDates = $scope.func.getFilterDates();
            
            var data = $scope.data.source.slice((filterDates.startDate - $scope.data.boundaries.startDate) / 60000 + 1,
                (filterDates.finishDate - $scope.data.boundaries.startDate) / 60000 + 1);

            $scope.data.maxPeriods = { count: 0, intervals: [], dates: [] };
            for (var i = 0; i < data.length; i++) {
                if ($scope.data.maxPeriods.count < data[i]) {
                    $scope.data.maxPeriods.count = data[i];
                    $scope.data.maxPeriods.intervals = [];
                    $scope.data.maxPeriods.intervals.push(i);
                }
                else if ($scope.data.maxPeriods.count == data[i]) {
                    $scope.data.maxPeriods.intervals.push(i);
                }
            }
            $scope.func.getMaxPeriods($scope.data.boundaries.startDate);

            $scope.func.buildChart(data, filterDates.startDate, filterDates.finishDate);
        },
        buildChart: function (data, fromDate, toDate) {
            if (data.length > 100) {
                var shiftValue = 100;
                $scope.labels = [];
                $scope.graph = [[]];

                var shift = parseInt(data.length / shiftValue);
                var shiftInTicks = shift * 60000;

                for (var i = 0; i <= shiftValue; i++) {
                    if (i == 0 || i == shiftValue) {
                        if (i == 0) {
                            $scope.labels.push($scope.func.formatDate(fromDate));
                            $scope.graph[0].push(data[0]);
                        } else {
                            $scope.labels.push($scope.func.formatDate(toDate));
                            $scope.graph[0].push(data[data.length - 1]);
                        }
                    }
                    else {
                        var shiftStart = (i - 1) * shift;
                        var shiftFinish = shiftStart + shift;

                        var aggregate = 0;
                        for (var j = shiftStart; j < shiftFinish; j++) {
                            aggregate += data[j];
                        }

                        $scope.graph[0].push(aggregate / shift);
                        $scope.labels.push($scope.func.formatDate(new Date(fromDate.getTime() + ((i - 0.5) * shiftInTicks))));
                    }
                }
            }
            else {
                $scope.labels = [];
                $scope.graph = [[]];
                for (var i = 0; i < data.length; i++) {
                    $scope.graph[0].push(data[i]);
                    $scope.labels.push($scope.func.formatDate(new Date(fromDate.getTime() + i)));
                }
            }
        },
        formatDate: function (date) {
            var addZero = function (i) {
                if (i < 10) {
                    i = "0" + i;
                }
                return i;
            }

            return addZero(date.getDate()) + "." + addZero((date.getMonth() + 1)) + "." + date.getFullYear() + " "
                + addZero(date.getHours()) + ":" + addZero(date.getMinutes());
        },
        validateFilter: function () {
            $scope.filterForm.$setValidity("tooEarly", false);
            $scope.filterForm.$setValidity("tooLate", false);
            $scope.filterForm.$setValidity("startDateLaterThanFinishDate", false);

            var filterDates = $scope.func.getFilterDates();

            if (filterDates.startDate >= $scope.data.boundaries.startDate) {
                $scope.filterForm.$setValidity("tooEarly", true);
            }

            if (filterDates.finishDate <= $scope.data.boundaries.finishDate) {
                $scope.filterForm.$setValidity("tooLate", true);
            }

            if (filterDates.finishDate > filterDates.startDate) {
                $scope.filterForm.$setValidity("startDateLaterThanFinishDate", true);
            }
        }
    }

    $scope.dateOptions = {
        formatYear: 'yyyy',
        startingDay: 1,
        showWeeks: false
    };

    $scope.options = {
        scales: {
            yAxes: [
              {
                  id: 'y-axis-1',
                  type: 'linear',
                  display: true,
                  position: 'left',
                  ticks: {
                      beginAtZero: true
                  }
              }
            ]
        }
    };

    $scope.filter = {};

    $scope.open2 = function () {
        $scope.popup2.opened = true;
    };

    $scope.popup2 = {
        opened: false
    };

    $scope.open3 = function () {
        $scope.popup3.opened = true;
    };

    $scope.popup3 = {
        opened: false
    };
}]);