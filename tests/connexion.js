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
          browser.assert.textEquals('#active-users', '1 actifs');
          //browser.element.find('#active-users').assert.valueEquals('3 actifs');
      });

      it('Multiple connexions à une salle', async function() {
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
          
      });
      
      
  
  });