module.exports = (config) => {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    reporters: ['progress', 'kjhtml'],
    client: {
      clearContext: false,
      jasmine: { random: false },
    },
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--disable-dev-shm-usage', '--disable-gpu', '--no-sandbox'],
      },
    },
  });
};
