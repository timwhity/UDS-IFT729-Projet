module.exports = {
    before: async function (browser) {

        //Declaring Global Timeout
        browser.globals.waitForConditionTimeout = 7000
        await browser
        .navigateTo('http://localhost:3000');
    
        await browser.element.find('#userIdCreate');
        await browser.element.find('#roomIdCreate');
        await browser.element.find('#mdpCreate');
    },
    "Multiple connexions à une salle avec ajout d'élement": async function (browser) {
            // open a new tab (default)
            browser.window.open(function () {
              console.log('new tab opened successfully');
            });
        
            // open a new window
            browser.window.open('window', function () {
              console.log('new window opened successfully');
            });
            const originalWindow = await browser.window.getHandle();
            const allWindows = await browser.window.getAllHandles();

            for (const windowHandle of allWindows) {
                if (windowHandle !== originalWindow) {
                  await browser.window.switchTo(windowHandle);
                  break;
                }
            }
        await browser
          .navigateTo('http://localhost:3000');
          await browser.element.find('#userId');
          await browser.element.find('#roomId');
          await browser.element.find('#mdp');
          browser.element.find('#userId').setValue("toto");
          browser.element.find("#roomId").setValue("test1");
          browser.element.find('#mdp').setValue("test1");
          browser.element.find("#btn_join").click();
          await browser.element.find('#lock');
          await browser.element.find('#active-users');
          browser.element.find("#addRect").click();
          await browser.element.find('canvas.upper-canvas');
          const result = await browser.element('canvas.upper-canvas').getRect();
          await browser.element.find('canvas.upper-canvas').click();
          browser.element.find("#addCircle").click();
          await browser.element.find('canvas.upper-canvas').click();
          browser.element.find("#del").click();
          let screenshot = browser.element.find('canvas.upper-canvas').takeScreenshot();
          let firstScreenShot = null;
          screenshot.then((screenshotData) => {
              firstScreenShot =screenshotData;
              require('fs/promises').writeFile('out1.png', screenshotData, 'base64');
          });
          browser.window.switchTo(originalWindow);
          await browser
          .navigateTo('http://localhost:3000');
      
          await browser.element.find('#userId');
          await browser.element.find('#roomId');
          await browser.element.find('#mdp');
          browser.element.find('#userId').setValue("toto1");
          browser.element.find("#roomId").setValue("test1");
          browser.element.find('#mdp').setValue("test1");
          browser.element.find("#btn_join").click();
          await browser.element.find('#lock');
          await browser.element.find('#active-users');
          screenshot = browser.element.find('canvas.upper-canvas').takeScreenshot();
          let lastScreenShot = null;
            screenshot.then((screenshotData) => {
                lastScreenShot =screenshotData;
                require('fs/promises').writeFile('out.png', screenshotData, 'base64');
            });
      },

    after: function (browser) {
        browser.end()
    }
}