/**
 * End-to-end test for the sample Vue3+Vite todo app located at
 * https://github.com/nightwatchjs-community/todo-vue
 */
describe("Test de creation d'une salle ", function() {

    // using the new element() global utility in Nightwatch 2 to init elements
    // before tests and use them later
    const identifiant = element('#userIdCreate');
    const identifiantTableau = element('#roomIdCreate');
    const motdePasse = element("#mdpCreate");
    const roomName = "test1"+(new Date());

  
   it('Création de la salle par remplissage des champs', async function() {
      await browser
        .navigateTo('http://localhost:3000');
    
        await browser.element.find('#userIdCreate');
        await browser.element.find('#roomIdCreate');
        await browser.element.find('#mdpCreate');
        browser.element.find('#userIdCreate').setValue("test1");
        browser.element.find("#roomIdCreate").setValue(roomName);
        browser.element.find('#mdpCreate').setValue("test1");
        browser.element.find("#btn_create").click();
        await browser.element.find('#lock');
    });

    it('Connexion à une salle', async function() {
        await browser
          .navigateTo('http://localhost:3000');
      
          await browser.element.find('#userId');
          await browser.element.find('#roomId');
          await browser.element.find('#mdp');
          browser.element.find('#userId').setValue("toto3");
          browser.element.find("#roomId").setValue(roomName);
          browser.element.find('#mdp').setValue("test1");
          browser.element.find("#btn_join").click();
          await browser.element.find('#lock');
          await browser.element.find('#active-users');
          browser.assert.textEquals('#active-users', '2 actifs');
          //browser.element.find('#active-users').assert.valueEquals('3 actifs');
      });

      /* it('Multiple connexions à une salle', async function() {
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

         await browser
          .navigateTo('http://localhost:3000');
          await browser.waitUntil(async function () {
            const windowHandles = await browser.window.getAllHandles();
      
            return windowHandles.length === 2;
          });
      
          const originalWindow = await browser.window.getHandle();
          const allWindows = await browser.window.getAllHandles();
      
          // loop through available windows to find the new window handle
          for (const windowHandle of allWindows) {
            if (windowHandle !== originalWindow) {
              await browser.window.switchTo(windowHandle);
              break;
            }
          }
      
          const currentWindow = await browser.window.getHandle();
          await browser.assert.notEqual(currentWindow, originalWindow);
      
          
      });*/
/* await browser.element.find('#userId');
          await browser.element.find('#roomId');
          await browser.element.find('#mdp');
          browser.element.find('#userId').setValue("toto1");
          browser.element.find("#roomId").setValue("test1");
          browser.element.find('#mdp').setValue("test1");
          browser.element.find("#btn_join").click();
          await browser.element.find('#lock');*/

          /* browser
            .url('http://localhost:3000')
            .waitForElementVisible('#userId')
            .pause(1000)
            .windowHandles(function (result) {
                var handle = result.value[1];
                browser.switchWindow(handle);
            })*/
      
      
  
  });