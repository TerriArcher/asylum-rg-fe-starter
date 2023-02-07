const rawApiDataToPlotlyReadyInfo = (view, office, data) => {
  const officeNames = [
    'Los Angeles, CA',
    'San Francisco, CA',
    'New York, NY',
    'Houston, TX',
    'Chicago, IL',
    'Newark, NJ',
    'Arlington, VA',
    'Boston, MA',
    'Miami, FL',
    'New Orleans, LA',
  ];
  let rowItem;
  let rowsForTable;

  function sortByYear(arr) {
    let sortedArr = arr.sort((a, b) => {
      const yearA = parseInt(a.fiscal_year);
      const yearB = parseInt(b.fiscal_year);

      if (yearA < yearB) {
        return -1;
      }
      if (yearA > yearB) {
        return 1;
      }
      return 0;
    });
    return sortedArr;
  }

  const yearResultsSorted = sortByYear(data[0].yearResults);

  let yearMinMax = []; //variable to set minYear and MaxYear
  for (let yearResults of data[0]['yearResults']) {
    yearMinMax.push(yearResults['fiscal_year']);
  }

  const yearByOfficeByGrant = {}; //Object that contacts year by Office by grant rate information
  for (let office of data[0]['yearResults']) {
    if (!yearByOfficeByGrant[office['fiscal_year']])
      yearByOfficeByGrant[office['fiscal_year']] = {}; //if year not existing set to empty object
    for (let yearData of office['yearData']) {
      yearByOfficeByGrant[office['fiscal_year']][yearData['office']] = {
        //assign rates to year:{office:{}}
        granted: yearData['granted'] * 100,
        adminClosed: toPercentage(
          yearData['totalCases'],
          yearData['adminClosed']
        ),
        denied: toPercentage(yearData['totalCases'], yearData['denied']),
      };
    }
  }

  const officeData = {}; //object that holds each % as a key of array value
  for (let officeName of officeNames) {
    officeData[officeName] = {
      xYears: [],
      totals: [],
      yTotalPercentGranteds: [],
      totalPercentAdminCloseds: [],
      totalPercentDenieds: [],
    };
  }
  for (let yearResults of yearResultsSorted) {
    for (let yearData of yearResults['yearData']) {
      officeData[yearData['office']]['xYears'].push(yearResults['fiscal_year']);
      officeData[yearData['office']]['totals'].push(yearData['totalCases']);
      officeData[yearData['office']]['yTotalPercentGranteds'].push(
        yearData['granted'] * 100
      );
      officeData[yearData['office']]['totalPercentAdminCloseds'].push(
        toPercentage(yearData['totalCases'], yearData['adminClosed'])
      );
      officeData[yearData['office']]['totalPercentDenieds'].push(
        toPercentage(yearData['totalCases'], yearData['denied'])
      );
    }
  }

  function toPercentage(total, value) {
    return (value / total) * 100;
  }

  if (!office || office === 'all') {
    switch (view) {
      case 'time-series':
        const rowsForAllDisplay = [];
        for (let yearResults of yearResultsSorted) {
          rowItem = {
            'Fiscal Year': yearResults.fiscal_year,
            'Total Cases': yearResults.totalCases,
            '% Granted': Number(yearResults.granted * 100).toFixed(2),
            '% Admin Close / Dismissal': Number(
              toPercentage(yearResults.totalCases, yearResults.adminClosed)
            ).toFixed(2),
            '% Denied': Number(
              toPercentage(yearResults.totalCases, yearResults.denied)
            ).toFixed(2),
          };
          rowsForAllDisplay.push(rowItem);
        }

        const finalData = {
          xYears: [],
          totals: [],
          yTotalPercentGranteds: [],
          totalPercentAdminCloseds: [],
          totalPercentDenieds: [],
        };
        for (let officeName of data[0]['yearResults']) {
          finalData['xYears'].push(officeName['fiscal_year']);
          finalData['totals'].push(officeName['totalCases']);
          finalData['yTotalPercentGranteds'].push(officeName['granted'] * 100);
          finalData['totalPercentAdminCloseds'].push(
            toPercentage(officeName['totalCases'], officeName['adminClosed'])
          );
          finalData['totalPercentDenieds'].push(
            toPercentage(officeName['totalCases'], officeName['denied'])
          );
        }

        return { ...finalData, rowsForAllDisplay, officeData };

      case 'office-heat-map':
        rowsForTable = [];
        for (let yearResults of yearResultsSorted) {
          for (let officeKey of officeNames) {
            if (
              yearResults.yearData.filter(
                yearItem => yearItem.office === officeKey
              ).length > 0
            ) {
              let total = yearResults.yearData.filter(
                yearItem => yearItem.office === officeKey
              )[0].totalCases;
              rowItem = {
                'Year [Office]':
                  String(yearResults.fiscal_year) +
                  ' [' +
                  String(officeKey) +
                  ']',
                'Total Cases': total,
                '% Granted': Number(
                  yearResults.yearData.filter(
                    yearItem => yearItem.office === officeKey
                  )[0].granted * 100
                ).toFixed(2),
                '% Admin Close / Dismissal': toPercentage(
                  total,
                  Number(
                    yearResults.yearData.filter(
                      yearItem => yearItem.office === officeKey
                    )[0].adminClosed
                  )
                ).toFixed(2),
                '% Denied': toPercentage(
                  total,
                  Number(
                    yearResults.yearData.filter(
                      yearItem => yearItem.office === officeKey
                    )[0].denied
                  )
                ).toFixed(2),
              };
              rowsForTable.push(rowItem);
            }
          }
        }
        const officeHeatMapDataObject = {
          //declare helper object to construct data for heatmap plotly
          x: officeNames, //office
          y: [], //year
          z: [], //rate
        };
        for (let fiscal_year in yearByOfficeByGrant) {
          //loop through
          officeHeatMapDataObject['y'].push(fiscal_year); //include year into y axis
          let zAxisArray = []; //Array to hold each row for z axis
          for (let officeName of officeNames) {
            //loop using unique office names
            zAxisArray.push(
              yearByOfficeByGrant[fiscal_year][officeName]
                ? yearByOfficeByGrant[fiscal_year][officeName]['granted'] * 100
                : 0
            );
          }
          officeHeatMapDataObject['z'].push(zAxisArray); //push to zaxis array
        }
        return { officeHeatMapDataObject, rowsForTable };

      case 'citizenship':
        rowsForTable = [];
        for (let item of data[0].citizenshipResults) {
          rowItem = {
            Citizenship: item.citizenship,
            'Total Cases': item.totalCases,
            '% Granted': Number(item.granted * 100).toFixed(2),
            '% Admin Close / Dismissal': toPercentage(
              item.totalCases,
              Number(item.adminClosed)
            ).toFixed(2),
            '% Denied': toPercentage(
              item.totalCases,
              Number(item.denied)
            ).toFixed(2),
          };
          rowsForTable.push(rowItem);
        }
        const countryGrantRateObj = {
          countries: [],
          countriesPercentGranteds: [],
        };
        for (let country of data[0]['citizenshipResults']) {
          countryGrantRateObj['countries'].push(country['citizenship']);
          countryGrantRateObj['countriesPercentGranteds'].push(
            (country['granted'] * 100).toFixed(2)
          );
        }
        return {
          rowsForTable,
          countryGrantRateObj,
        };
      default:
        return {};
    }
  } else {
    switch (view) {
      case 'time-series':
        rowsForTable = [];
        yearResultsSorted.sort((a, b) => a.fiscal_year - b.fiscal_year);
        for (let i = 0; i < yearResultsSorted.length; i++) {
          if (
            yearResultsSorted[i].yearData.filter(
              dataItem => dataItem.office === office
            )[0]
          ) {
            const officeObj = yearResultsSorted[i].yearData.filter(
              dataItem => dataItem.office === office
            )[0];
            rowItem = {
              'Fiscal Year': yearResultsSorted[i].fiscal_year,
              'Total Cases': officeObj.totalCases,
              '% Granted': Number(officeObj.granted * 100).toFixed(2),
              '% Admin Close / Dismissal': toPercentage(
                officeObj.totalCases,
                Number(officeObj.adminClosed)
              ).toFixed(2),
              '% Denied': toPercentage(
                officeObj.totalCases,
                Number(officeObj.denied)
              ).toFixed(2),
            };
            rowsForTable.push(rowItem);
          }
        }
        const singleOfficeDataObject = officeData[office];
        return {
          rowsForTable,
          singleOfficeDataObject,
        };

      case 'citizenship':
        rowsForTable = [];
        for (let item of data[0].citizenshipResults) {
          rowItem = {
            Citizenship: item.citizenship,
            'Total Cases': item.totalCases,
            '% Granted': Number(item.granted * 100).toFixed(2),
            '% Admin Close / Dismissal': toPercentage(
              item.totalCases,
              Number(item.adminClosed)
            ).toFixed(2),
            '% Denied': toPercentage(
              item.totalCases,
              Number(item.denied)
            ).toFixed(2),
          };
          rowsForTable.push(rowItem);
        }
        const countryGrantRateObj = {
          countries: [],
          countriesPercentGranteds: [],
        };
        for (let country of data[0]['citizenshipResults']) {
          countryGrantRateObj['countries'].push(country['citizenship']);
          countryGrantRateObj['countriesPercentGranteds'].push(
            country['granted'] * 100
          );
        }
        return {
          rowsForTable,
          countryGrantRateObj,
        };
      default:
        return {};
    }
  }
};

export { rawApiDataToPlotlyReadyInfo };
