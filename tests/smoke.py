# Browser smoke test. Start the app first:  python3 -m http.server 8099
# Then run:  pip install playwright && playwright install chromium && python3 tests/smoke.py
import os; os.makedirs('shots', exist_ok=True)
import sys
from playwright.sync_api import sync_playwright
S='shots/'
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium') if False else p.chromium.launch()
    pg=b.new_page(viewport={'width':1000,'height':800})
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
    pg.goto('http://localhost:8099/index.html'); pg.wait_for_selector('.hero')
    assert pg.is_disabled('#btn-back') and pg.is_disabled('#btn-fwd')
    pg.screenshot(path=S+'home-light.png')
    # navigation + back/forward
    pg.click('#nav a[href="#/learn"]'); pg.click('a[href="#/learn/l-ra-1"]'); pg.wait_for_selector('h1:text("Policy and rights")')
    assert not pg.is_disabled('#btn-back')
    pg.click('#btn-back'); pg.wait_for_selector('h1:text("Learn")')
    assert not pg.is_disabled('#btn-fwd'), 'fwd should be enabled'
    pg.click('#btn-fwd'); pg.wait_for_selector('h1:text("Policy and rights")')
    assert pg.is_disabled('#btn-fwd')
    pg.click('#btn-back'); pg.click('#btn-back'); pg.wait_for_selector('.hero'); assert pg.is_disabled('#btn-back')
    # theme
    pg.click('#btn-theme'); assert pg.get_attribute('html','data-theme')=='dark'; pg.screenshot(path=S+'home-dark.png')
    pg.reload(); pg.wait_for_selector('.hero'); assert pg.get_attribute('html','data-theme')=='dark'
    # explorer
    pg.click('#nav a[href="#/explore"]'); pg.fill('#q','restraint'); pg.wait_for_timeout(100)
    n=pg.locator('.row-card').count(); print('restraint results',n); assert n>0
    pg.screenshot(path=S+'explore-dark.png')
    pg.locator('.row-card').first.click(); pg.wait_for_selector('.lead'); pg.screenshot(path=S+'section.png')
    # quiz
    pg.click('#nav a[href="#/quiz"]'); pg.click('button:text("Start quiz")'); pg.wait_for_selector('.opt')
    for i in range(10):
        pg.locator('.opt').first.click(); pg.click('#next')
    pg.wait_for_selector('h1:text-matches("Result")'); pg.screenshot(path=S+'quiz-result.png')
    pg.click('#btn-back'); pg.wait_for_selector('h1:text("Quiz")')  # back from result should not loop into a new quiz run
    print('after back:',pg.url, pg.inner_text('h1'))
    # flashcards
    pg.click('#nav a[href="#/flash"]'); pg.click('button[data-deck="all"]'); pg.click('#show'); pg.screenshot(path=S+'flash.png'); pg.click('#known')
    # scenarios
    pg.click('#nav a[href="#/scenarios"]'); pg.click('a[href="#/scenarios/sc-emergency"]'); pg.click('#begin')
    pg.locator('.opt').nth(1).click(); pg.screenshot(path=S+'scenario.png'); pg.click('#next')
    # tools
    pg.goto('http://localhost:8099/index.html#/tools/checklist'); pg.wait_for_selector('.check'); pg.locator('.check input').first.check()
    pg.goto('http://localhost:8099/index.html#/tools/compare'); pg.wait_for_selector('.crow'); pg.screenshot(path=S+'compare.png')
    pg.goto('http://localhost:8099/index.html#/tools/actionplan'); pg.wait_for_selector('textarea'); pg.fill('textarea >> nth=0','test'); 
    pg.goto('http://localhost:8099/index.html#/progress'); pg.wait_for_selector('.stats'); pg.screenshot(path=S+'progress.png')
    for r in ['/glossary','/paths','/paths/p-lgu','/learn','/about','/tools','/explore/a25-annex-e','/quiz/start/topic:consent']:
        pg.goto('http://localhost:8099/index.html#'+r); pg.wait_for_timeout(150)
        assert pg.inner_text('h1'), r
    # mobile
    m=b.new_page(viewport={'width':375,'height':740}); m.on('pageerror',lambda e:errs.append(str(e)))
    m.goto('http://localhost:8099/index.html#/tools/compare'); m.wait_for_selector('.crow >> nth=1'); m.screenshot(path=S+'mobile-compare.png')
    sw=m.evaluate('document.documentElement.scrollWidth'); print('mobile scrollWidth',sw); assert sw<=376
    b.close()
print('ERRORS',errs)
