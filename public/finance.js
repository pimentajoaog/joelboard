/* Finanças — app logic. © 2026 Joel Soluções LTDA. All rights reserved.
   Loads after /joelboard.js, /finance-math.js, /finance-sheets.js (classic global scripts). */
/* ====================== i18n ENGINE ====================== */
/* Language lives in DATA.settings.lang ('ptBR' | 'en'); defaults to pt-BR.
   t(key, vars) -> string. Dictionary values may be strings with {placeholders}
   or functions (vars)=>string for plurals / complex cases.
   Category NAMES are user data (stored in the sheet) and are intentionally NOT
   translated here — only UI chrome and generated messages are. */
const I18N = {
  en: {
    weekdays: ['Su','Mo','Tu','We','Th','Fr','Sa'],
    monthsShort: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    fallbackCats: ['🍔 Food & Groceries','🚌 Transport','🏠 Housing & Utilities','🎬 Entertainment','💊 Health','🛍️ Shopping','💼 Salary','💻 Freelance','✂️ Personal Care','🙏 Spiritual','📚 Education','💡 Bills','🎮 Games & Tech','❓ Other'],
    'cat.salary':'💼 Salary', 'cat.savings':'💰 Savings',

    'loading':'Loading your finances…', 'app.title':'Finance', 'app.subtitle':'Personal dashboard',
    'nav.today':'Today', 'badge.projected':'Projected', 'badge.past':'Past', 'badge.current':'Current', 'badge.allSet':'All set!',
    'action.refresh':'Refresh data', 'action.hub':'Back to hub', 'action.toggleTheme':'Toggle theme', 'eye.reveal':'Reveal this past month', 'eye.dim':'Dim this past month', 'eye.show':'Show amounts', 'eye.hide':'Hide amounts',

    'tab.overview':'Overview', 'tab.worklog':'Work Log', 'tab.money':'Money',
    'split.open':'+ Split a bill', 'split.title':'Split a bill', 'split.outingName':'What was it?', 'split.outingPh':'e.g. Friday drinks', 'split.people':'People', 'split.addPerson':'+ Add', 'split.namePh':'Name…', 'split.me':'Me', 'split.meHint':'Tap a name to mark who you are (★).', 'split.items':'Items', 'split.addItem':'+ Add item', 'split.itemName':'Item', 'split.qty':'Qty', 'split.totalPh':'Total', 'split.unit':'each', 'split.assigned':'assigned', 'split.divideEqual':'Split evenly', 'split.allMine':'All mine', 'split.service':'Service fee', 'split.perPerson':'Per person', 'split.grand':'Total', 'split.unassignedWarn':"Some items aren't fully assigned yet.", 'split.copy':'Copy summary', 'split.save':'Save who owes me', 'split.copied':'✓ Summary copied', 'split.saved':'✓ Saved to “Who owes me”', 'split.untitled':'Outing', 'split.errNoDebt':'Assign items to at least one other person first.', 'split.modeTotal':'Total', 'split.modeEach':'Each', 'split.eachPh':'Each',
    'debts.title':'🍻 Who owes me', 'debts.toReceive':'To receive', 'debts.empty':'Split a bill to start tracking who owes you.', 'debts.markPaid':'Mark paid', 'debts.paid':'✓ Paid', 'debts.deleteOuting':'Delete outing', 'debts.delTitle':'Delete this outing?', 'debts.delMsg':"This removes everyone's debt for it.", 'debts.yourShare':'Your share',
    'tab.bills':'Bills & Savings', 'tab.budget':'Budget',

    'sum.income':'Income', 'sum.expenses':'Expenses', 'sum.balance':'Balance',
    'sum.savingsRate':'Savings Rate', 'sum.loggedIncome':'Logged Income',
    'sum.projectedCosts':'Projected Costs', 'sum.expectedBalance':'Expected Balance',
    'sum.thisMonth':'this month', 'sum.netThisMonth':'net this month',
    'sum.ofIncomeSaved':'of income saved', 'sum.inclBills':'incl. bills + savings',
    'sum.txCount': v => v.n + ' transaction' + (v.n===1?'':'s'),

    'sec.incomeVsBudget':'💵 Income vs Budget', 'sec.spendingBreakdown':'📊 Spending Breakdown',
    'sec.thisWeek':'🗓 This Week — due in the next 7 days',
    'sec.transactions':'🧾 Transactions', 'sec.bills':'🔄 Bills',
    'sec.goals':'🎯 Savings Goals', 'sec.bundles':'📨 Payment Bundles', 'sec.budget':'📊 Budget',

    'worklog.hint':'💼 Work Log — tap days you worked · tap a weekday to set it off · tap hours to edit',
    'worklog.logIncome':'Log as Income →',

    'action.add':'+ Add', 'action.addShort':'Add', 'action.markAllPaid':'Mark all paid',
    'action.confirm':'Confirm', 'action.cancel':'Cancel', 'action.yes':'Yes',
    'action.save':'Save', 'action.done':'Done', 'action.saving':'Saving…',

    'filter.allTypes':'All types', 'filter.allCats':'All categories',
    'opt.income':'Income', 'opt.expense':'Expense',
    'sort.newest':'Newest first', 'sort.oldest':'Oldest first',
    'sort.amtDesc':'Amount ↓', 'sort.amtAsc':'Amount ↑', 'sort.nameAz':'Name A–Z',
    'sortbill.due':'By due date', 'sortbill.name':'Name A–Z',
    'sortbill.amtDesc':'Amount ↓', 'sortbill.amtAsc':'Amount ↑', 'sortbill.created':'Order added',

    'empty.noSpending':'No spending this month yet.',
    'empty.weekDash':'—',
    'empty.noTxAdd':'No transactions this month. Tap “+ Add”.',
    'empty.noTxFilter':'No transactions match these filters.',
    'empty.bills':'Tap “+ Add”. Leave the installments field blank for an ongoing bill, or fill it in for one that ends.',
    'empty.goals':'Tap “+ Add” to create a goal.',
    'empty.bundles':'Group bills & savings you pay to one person, then check them off together.',
    'empty.budget':'Tap “+ Add” to set a category budget.',
    'empty.noBudgetSuggest':'No category spending to suggest budgets from for this period yet.',
    'empty.noHistory':'Not enough history for this period. Log some expenses or add recurring bills, then suggestions will appear here.',
    'empty.bundleChecklist':'Add recurring bills or savings first.',
    'empty.noCats':'No categories yet — add one above.',

    'fab.transaction':'💸 Transaction', 'fab.bill':'🔄 Bill', 'fab.goal':'🎯 Goal',
    'fab.budget':'📊 Budget', 'fab.bundle':'📨 Bundle', 'fab.split':'🍻 Split bill',

    'f.type':'Type', 'f.date':'Date', 'f.description':'Description', 'f.category':'Category',
    'f.amount':'Amount', 'f.monthlyAmount':'Monthly Amount', 'f.name':'Name',
    'f.dueDay':'Due Day', 'f.recurring':'Recurring?', 'f.installments':'# of Installments (blank = ongoing bill)',
    'f.startsFrom':'Starts from', 'f.month':'Month', 'f.goalName':'Goal Name',
    'f.targetAmount':'Target Amount', 'f.startingBalance':'Starting Balance',
    'f.startingBalanceNote':' — planned savings add on top',
    'f.deadline':'Deadline (optional — goal hides after it passes)', 'f.color':'Color',
    'f.amountPerOcc':'Amount per occurrence', 'f.howOften':'How often',
    'f.numMonths':'# of Months', 'f.startingMonth':'Starting Month',
    'f.bundleName':'Bundle Name', 'f.payee':'Send To (payee)', 'f.linkedItems':'Linked items',
    'f.monthlyBudget':'Monthly Budget',

    'type.expense':'💸 Expense', 'type.income':'💰 Income',
    'bill.recurring':'🔄 Recurring', 'bill.onetime':'📌 One-time',

    'amt.tx':'Amount (<span class="cur-sym"></span>)',
    'amt.monthly':'Monthly Amount (<span class="cur-sym"></span>)',
    'amt.budget':'Monthly Budget (<span class="cur-sym"></span>)',
    'amt.target':'Target Amount (<span class="cur-sym"></span>)',
    'amt.startBal':'Starting Balance (<span class="cur-sym"></span> — planned savings add on top)',
    'amt.perOcc':'Amount per occurrence (<span class="cur-sym"></span>)',

    'ph.txDesc':'e.g. Mercado, Salário…', 'ph.billName':'e.g. Netflix, Rent, Air Fryer…',
    'ph.dueDay':'1–31', 'ph.installments':'blank = forever', 'ph.goalName':'e.g. Emergency Fund',
    'ph.numMonths':'e.g. 6', 'ph.bundleName':'e.g. Owed to João', 'ph.payee':'e.g. João, Mom…',
    'ph.newCat':'e.g. 🎸 Music', 'ph.actualAmount':'Actual amount', 'ph.hours':'Hours',
    'ph.amount':'0,00',

    'tx.add':'Add Transaction', 'tx.edit':'Edit Transaction',
    'tx.save':'Save Transaction', 'tx.update':'Update Transaction', 'tx.delete':'Delete Transaction',
    'bill.add':'Add Bill', 'bill.edit':'Edit Bill', 'bill.save':'Save Bill',
    'bill.update':'Update Bill', 'bill.delete':'Delete Bill',
    'budget.add':'Add Budget Category', 'budget.edit':'Edit Budget Category',
    'budget.save':'Save Budget', 'budget.update':'Update Budget', 'budget.delete':'Delete Category',
    'goal.add':'Add Savings Goal', 'goal.edit':'Edit Savings Goal',
    'goal.save':'Save Goal', 'goal.update':'Update Goal', 'goal.delete':'Delete Goal',
    'alloc.add':'Plan a Saving', 'alloc.edit':'Edit Saving Plan', 'alloc.save':'Save Saving Plan',
    'alloc.update':'Update Saving Plan', 'alloc.delete':'Delete Saving Plan', 'alloc.subDefault':'Toward your goal',
    'alloc.skipMonth':'Skip this month', 'alloc.editPlan':'Edit plan', 'alloc.amtPrompt':'Amount for this month (planned {amt})', 'alloc.planned':'planned {x}',
    'bundle.add':'Add Payment Bundle', 'bundle.edit':'Edit Payment Bundle',
    'bundle.save':'Save Bundle', 'bundle.update':'Update Bundle', 'bundle.delete':'Delete Bundle',

    'alloc.opt.monthly':'Every month (ongoing)', 'alloc.opt.once':'One-time', 'alloc.opt.fixed':'Fixed number of months',

    'set.title':'⚙️ Settings', 'set.tabIncome':'Income', 'set.tabCats':'Categories',
    'set.tabThemes':'Themes', 'set.tabLang':'Language',
    'set.payModel':'Pay model', 'set.hourly':'⏱ Hourly', 'set.salaried':'📅 Salaried',
    'set.hourlyRate':'Hourly rate', 'set.monthlySalary':'Monthly salary',
    'set.stdHours':'Standard hours per day', 'set.overtime':'Overtime',
    'set.otMult':'Overtime multiplier (× base rate)', 'set.currency':'Currency',
    'set.singleCur':'Single currency', 'set.convert':'Convert', 'set.paidIn':'Paid in',
    'set.trackIn':'Track & display in', 'set.exchRate':'Exchange rate',
    'set.saveIncome':'Save Income Settings',
    'set.hourlyRateCur':'Hourly rate (<span class="cur-from-lbl">USD</span>)',
    'set.monthlySalaryCur':'Monthly salary (<span class="cur-from-lbl">USD</span>)',
    'set.exchRateCur':'Exchange rate (<span id="setExchLbl">to per from</span>)',
    'set.catHint':'New categories get an auto colour — tap a swatch to change it. Deleting one leaves its transactions as “Uncategorized”.',
    'set.themeHint':'Pick a skin below. Toggle day/night in settings or with the moon/sun in the header.',
    'set.langHint':'Choose the language for the whole app. This changes labels and messages — your data stays the same.',
    'ot.off':'Off — extra hours at normal pay', 'ot.auto':'Automatic — paid over monthly expected',
    'ot.manual':'Manual — tag overtime per day',
    'set.exchUnit': v => v.to + ' per ' + v.from,

    'ask.title':'Are you sure?',
    'cc.title':'Mark as paid', 'cc.paidToday':'Paid today', 'cc.backThen':'Back then',
    'cc.noDiffered':'No, it differed',
    'cc.wasAmount': v => 'Was the amount actually <strong>' + v.amt + '</strong>?',
    'cc.backInMonth': v => 'Back in ' + v.month,
    'grp.title':'Confirm payments', 'grp.whenLeave':'When did this leave your account?',
    'grp.backIn':'Back in', 'grp.adjust':'Adjust amounts', 'grp.markAllBills':'Mark all bills paid',
    'grp.totalCap':'total to mark paid',
    'grp.itemsMonth': v => v.n + ' item' + (v.n===1?'':'s') + ' · ' + v.month,

    'toast.saved':'✓ Saved!', 'toast.updated':'✓ Updated', 'toast.updated2':'✓ Updated!',
    'toast.deleted':'🗑 Deleted', 'toast.budgetSet':'✓ Budget set', 'toast.markedPaid':'✓ Marked paid',
    'toast.allPaid':'All bills are already marked paid this month.',
    'toast.nothingPaid':'Nothing to mark paid.', 'toast.noIncome':'No income to log for this month.',
    'toast.incomeSaved':'✓ Income settings saved!', 'toast.catRenamed':'✓ Category renamed',
    'toast.catAdded':'✓ Category added', 'toast.catDeleted':'🗑 Category deleted',
    'toast.langSet':'✓ Language updated',
    'toast.theme': v => '✓ Theme · ' + v.name,
    'toast.loggedTo': v => '✓ Logged to ' + v.month + '! (' + v.amt + ')',
    'toast.otLogged': v => '✓ ' + v.h + ' logged as overtime',
    'toast.paidActual': v => '✓ Paid · actual ' + v.amt,
    'toast.nMarkedPaid': v => '✓ ' + v.n + ' marked paid',

    'err.prefix':'Error: ', 'err.allFields':'Please fill in all fields.',
    'err.billFields':'Please fill in name, amount and due day (1–31).',
    'err.budgetFields':'Please pick a category and amount.',
    'err.goalFields':'Please enter a name and target amount.',
    'err.amount':'Enter an amount.', 'err.numMonths':'Enter the number of months.',
    'err.bundleName':'Please give the bundle a name.', 'err.bundleItems':'Select at least one item to link.',
    'err.validHours':'Enter a valid number of hours.', 'err.validAmount':'Enter a valid amount.',
    'err.catName':'Type a category name (emoji welcome).', 'err.catExists':'That category already exists.',
    'err.stdHours':'Standard hours per day must be greater than 0.',
    'err.hourlyRate':'Enter your hourly rate.', 'err.salary':'Enter your monthly salary.',
    'err.exchRate':'Enter a valid exchange rate.',
    'err.catExistsNamed': v => 'A category named “' + v.name + '” already exists.',

    'confirm.deleteItemTitle':'Delete this item?', 'confirm.cantUndo':'This can’t be undone.', 'confirm.deleteCanUndo':'You can undo this right after.', 'billdel.title':'Delete this recurring bill?', 'billdel.month':'Only this month', 'billdel.onwards':'This month onwards', 'billdel.all':'All months', 'billamt.title':'Apply new amount how?', 'toast.billSkipped':'✓ Hidden for this month', 'toast.billStopped':'✓ Stopped from this month on', 'toast.billAmtMonth':'✓ Amount updated for this month', 'toast.billAmtOnwards':'✓ New amount from this month on', 'toast.allocSkipped':'✓ Skipped this month', 'toast.allocAmtMonth':'✓ Amount updated for this month',
    'confirm.catTitle':'Delete category?',
    'confirm.catDelete': v => 'Delete “' + v.name + '”? This can’t be undone.',
    'confirm.catUsed': v => '“' + v.name + '” is used by ' + v.txN + ' transaction' + (v.txN!==1?'s':'') + ' and ' + v.blN + ' bill' + (v.blN!==1?'s':'') + '.\nThey’ll show as Uncategorized until reassigned.',

    'cat.uncategorized':'Uncategorized', 'cat.uncatDash':'— Uncategorized —',
    'cat.uncatWas': v => 'Uncategorized (was ' + v.name + ')',

    'trend.over': v => '⚠ over budget ' + v.n + ' mo running — maybe raise it',
    'trend.trendingOver': v => 'trending over · ~' + v.avg + '/mo',
    'trend.room': v => 'lots of room · ~' + v.avg + '/mo avg',
    'trend.onTrack': v => 'on track · ~' + v.avg + '/mo avg',
    'suggest.more':'More from your spending', 'suggest.suggested':'Suggested from your recent spending',
    'suggest.perMo': v => '~' + v.avg + '/mo', 'suggest.set': v => 'Set ' + v.amt,

    'bd.spent': v => 'Spent ' + v.x, 'bd.toCome': v => 'Still to come ' + v.x,
    'bd.subBoth': v => v.spent + ' spent · ' + v.proj + ' to come', 'bd.subSpent': v => v.spent + ' spent',

    'cal.summary': v => '<strong>' + v.days + '</strong> days · <strong>' + v.hours + '</strong> worked',
    'cal.expected': v => ' · expected <strong>' + v.hours + '</strong>',
    'cal.ot': v => ' · <strong style="color:var(--warning)">' + v.hours + ' OT</strong>',
    'cal.baseOt': v => 'base ' + v.base + '  +  OT ' + v.ot,
    'ot.promptQ': v => 'You logged <strong>' + v.h + '</strong> above expected. Pay these at your overtime rate?',

    'tx.salaryDesc': v => 'Salary — ' + v.month + ' ' + v.year,
    'src.savings':'savings', 'src.bill':'bill',

    'bill.dayN': v => 'Day ' + v.d, 'bill.dueToday':'Due today!', 'bill.inDays': v => 'In ' + v.n + ' days',
    'bill.onetimeMeta':'one-time',
    'bill.installMeta': v => v.num + ' of ' + v.total + ' · ' + v.pct + '%',
    'bill.actualEst': v => 'actual · est ' + v.x,
    'preview.onetimeAmt': v => 'One-time · <strong>' + v.amt + '</strong> in ' + v.month,
    'preview.onetimeNo': v => 'One-time bill, charged once in ' + v.month,
    'preview.installment': v => 'Total <strong>' + v.total + '</strong> over ' + v.n + ' months · ends ' + v.month,

    'goal.daysLeft': v => v.n + ' days left · ' + v.date, 'goal.dueToday':'🔔 Due today!',
    'goal.of': v => 'of ' + v.x, 'goal.planSaving':'+ Plan a saving',
    'alloc.lbl.monthly':'monthly', 'alloc.lbl.once':'one-time',
    'alloc.toward': v => 'Toward: ' + v.name, 'misc.goal':'(goal)',
    'misc.removed':'(removed)', 'misc.unknown':'(unknown)',

    'bundle.savingsTo': v => '💰 Savings → ' + v.goal, 'bundle.noActive':'No active items this month',
    'bundle.paidCount': v => v.paid + '/' + v.total + ' paid',

    'ivb.noIncome': v => 'No income logged for this month yet. Your plan commits <strong style="color:var(--text)">' + v.committed + '</strong>' + v.detail + ' Log income to see how it fits.',
    'ivb.commitsDetail': v => ' (' + v.budgets + ' budgets + ' + v.savings + ' savings).',
    'ivb.budgets': v => 'Budgets ' + v.x, 'ivb.savings': v => 'Savings ' + v.x,
    'ivb.headroom': v => 'Headroom ' + v.x, 'ivb.over': v => 'Over ' + v.x,
    'ivb.plannedSavings':'💰 Planned savings', 'ivb.expectedIncome':'Expected income',
    'ivb.basedLast':'based on last month', 'ivb.overIncome':'over your income', 'ivb.unallocated':'unallocated',
    'ivb.incomeTitle': v => 'Income: ' + v.x,

    'digest.thisMonth':'this month', 'digest.savingsTo': v => 'Savings → ' + v.goal,
    'digest.overdueHead':'⚠️ Overdue — not yet ticked', 'digest.dueHead':'Due in the next 7 days',
    'digest.overdue':'overdue', 'digest.dueToday':'Due today', 'digest.tomorrow':'Tomorrow',
    'digest.inDays': v => 'In ' + v.n + ' days', 'digest.allClear':'Nothing due or overdue. 🎉',

    'mom.same':'≈ same', 'mom.vsLast': v => 'vs ' + v.x + ' last mo',

    'theme.active':'✓ Active', 'theme.apply':'Tap to apply',
    'theme.mood.default':'Clean · light & dark', 'theme.mood.vault':'Dark · private bank',
    'theme.mood.garden':'Warm · organic', 'theme.mood.aperture':'Light · minimal',
    'theme.mood.arcade':'Neon · retro-future', 'theme.mood.sorbet':'Light · pastel', 'theme.mood.press':'Light · editorial', 'theme.mood.mint':'Light · fresh',
    'lang.en':'English', 'lang.ptBR':'Português (Brasil)',
    'wizard.welcome':'Welcome 👋', 'wizard.step': v => 'Step ' + v.n + ' of 3',
    'wizard.step1Title':'Choose your language', 'wizard.step1Sub':'You can change this anytime in Settings.',
    'wizard.step2Title':'Currency', 'wizard.step2Sub':'How your money is shown across the app.',
    'wizard.convertQ':'Do you earn and spend in different currencies?',
    'wizard.step3Title':'How you get paid', 'wizard.step3Sub':'Used by the Work Log to estimate your income.',
    'wizard.next':'Next', 'wizard.back':'Back', 'wizard.finish':"Finish · Let's go", 'wizard.skip':'Skip for now', 'wizard.done':'✓ All set!',
    'sheet.title':'Set up your finance sheet',
    'sheet.sub':'Your data lives in your own Google Sheet, in your Drive. Create one now — it only takes a moment.',
    'sheet.create':'Create my sheet', 'sheet.creating':'Creating…',
    'sheet.haveOne':'I already have a sheet', 'sheet.linkLabel':'Paste your spreadsheet link',
    'sheet.linkPh':'https://docs.google.com/spreadsheets/…', 'sheet.linkBtn':'Link it', 'sheet.linking':'Linking…',
    'sheet.created':'✓ Sheet ready!', 'sheet.linkErr':'Could not open that sheet — check the link and that you have access.',
    'settled.badge':'✓ All settled this month', 'ph.search':'Search transactions…',
    'set.tabData':'Data', 'export.hint':'Save a full backup of all your data as a CSV in your Google Drive.',
    'export.btn':'Export backup', 'export.working':'Exporting…', 'export.done':'✓ Backup saved to your Drive', 'export.open':'Open file',
    'tour.start':'Take a quick tour', 'tour.step': v => 'Step ' + v.n + ' of ' + v.total,
    'tour.next':'Next', 'tour.back':'Back', 'tour.done':'Got it', 'tour.skip':'Skip tour',
    'tour.welcomeT':'Welcome! 👋', 'tour.welcomeB':'A quick tour of the five sections — you can skip anytime.',
    'tour.overviewT':'Overview', 'tour.overviewB':'Your month at a glance: income, expenses, spending breakdown, and what\u2019s due this week.',
    'tour.worklogT':'Work Log', 'tour.worklogB':'Tap the days you worked — the app turns your hours into income you can log.',
    'tour.moneyT':'Money', 'tour.moneyB':'All your transactions, plus how this month compares to last.',
    'tour.billsT':'Bills & Savings', 'tour.billsB':'Recurring bills, savings goals and payment bundles — tick them off as you pay.',
    'tour.budgetT':'Budget', 'tour.budgetB':'Set monthly budgets per category and get suggestions from your spending.',
    'tour.addT':'Add anything', 'tour.addB':'This + button quickly adds a transaction, bill, goal, budget or bundle.',
    'tour.settingsT':'Settings', 'tour.settingsB':'Your pay, currency, categories, themes, language — and the backup export.',
    'savings.title':'Total savings', 'savings.hint':'Tap to edit', 'savings.saved':'✓ Savings updated',
    'salary.add':'Add salary for every month', 'salary.remove':'Remove from this month onwards',
    'salary.recurring': v => 'Recurring salary · ' + v.amt + '/mo',
    'salary.addHint': v => 'Apply this month\u2019s income (' + v.amt + ') to every month',
    'salary.none':'No income calculated yet — log your worked days first.',
    'salary.added':'✓ Recurring salary set', 'salary.removed':'✓ Salary stopped from this month onwards', 'salary.auto':'auto',
    'savings.general':'General savings', 'savings.deposit':'Deposit', 'savings.withdraw':'Withdraw',
    'savings.depositTitle':'Deposit to savings', 'savings.withdrawTitle':'Withdraw from savings',
    'savings.depositDesc':'Deposit to savings', 'savings.withdrawDesc':'Withdrawal from savings',
    'savings.deposited':'✓ Added to savings', 'savings.withdrew':'✓ Withdrawn from savings',
    'savings.empty':'No recurring savings yet. Tap "+ Plan a saving" to set one up.',
    'fb.titleBug':'Report a bug', 'fb.titleFeature':'Feature request', 'fb.type':'Type',
    'fb.bug':'🐛 Bug', 'fb.feature':'💡 Feature', 'fb.message':'Message',
    'fb.ph':'Describe it — what happened, or what you\u2019d like…',
    'fb.send':'Send', 'fb.sent':'✓ Thanks! Sent.', 'fb.empty':'Write a short message first.',
    'fb.reportBug':'🐛 Report a bug', 'fb.requestFeature':'💡 Feature request', 'fb.open':'💬 Send feedback', 'fb.name':'Name', 'fb.namePh':'Your name', 'footer.rights':'All rights reserved.', 'acct.switch':'Switch', 'acct.logout':'Sign out', 'acct.hint':'Tap Sign out to switch Google accounts.',
    'runway.label': v => '≈ ' + v.n + ' months of buffer', 'goal.eta': v => '🎯 reaches ~' + v.date,
    'sec.trend':'📈 Spending — last 6 months',
    'recap.open':'📋 Month summary', 'recap.saved':'Saved', 'recap.top':'Top categories', 'recap.none':'No spending this month.',
    'toast.undo':'Undo', 'toast.restored':'↩ Restored',
    'imp.open':'Import transactions', 'imp.hint':'Paste one per line: Date, Description, Amount, Category, Type — separated by tab or comma. Date as YYYY-MM-DD; use a dot for decimals (120.50). Tip: copy rows straight from a spreadsheet.',
    'imp.ph':'2026-06-15, Mercado, 120.50, 🍔 Alimentação, Expense', 'imp.btn':'Import', 'imp.importing':'Importing…',
    'imp.done': v => '✓ ' + v.n + ' imported', 'imp.none':'Nothing valid to import — check the format.',
  },

  ptBR: {
    weekdays: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
    monthsShort: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
    fallbackCats: ['🍔 Alimentação','🚌 Transporte','🏠 Moradia e Contas','🎬 Entretenimento','💊 Saúde','🛍️ Compras','💼 Salário','💻 Freelance','✂️ Cuidados Pessoais','🙏 Espiritual','📚 Educação','💡 Contas','🎮 Jogos e Tecnologia','❓ Outros'],
    'cat.salary':'💼 Salário', 'cat.savings':'💰 Poupança',

    'loading':'Carregando suas finanças…', 'app.title':'Finance', 'app.subtitle':'Painel pessoal',
    'nav.today':'Hoje', 'badge.projected':'Projetado', 'badge.past':'Passado', 'badge.current':'Atual', 'badge.allSet':'Tudo certo!',
    'action.refresh':'Atualizar dados', 'action.hub':'Voltar ao hub', 'action.toggleTheme':'Alternar tema', 'eye.reveal':'Revelar este mês passado', 'eye.dim':'Ocultar este mês passado', 'eye.show':'Mostrar valores', 'eye.hide':'Ocultar valores',

    'tab.overview':'Visão geral', 'tab.worklog':'Jornada', 'tab.money':'Dinheiro',
    'split.open':'+ Rachar conta', 'split.title':'Rachar conta', 'split.outingName':'O que foi?', 'split.outingPh':'ex.: Bar na sexta', 'split.people':'Pessoas', 'split.addPerson':'+ Adicionar', 'split.namePh':'Nome…', 'split.me':'Eu', 'split.meHint':'Toque num nome para marcar quem é você (★).', 'split.items':'Itens', 'split.addItem':'+ Adicionar item', 'split.itemName':'Item', 'split.qty':'Qtd', 'split.totalPh':'Total', 'split.unit':'cada', 'split.assigned':'atribuído', 'split.divideEqual':'Dividir igual', 'split.allMine':'Tudo meu', 'split.service':'Taxa de serviço', 'split.perPerson':'Por pessoa', 'split.grand':'Total', 'split.unassignedWarn':'Alguns itens ainda não foram totalmente atribuídos.', 'split.copy':'Copiar resumo', 'split.save':'Salvar quem me deve', 'split.copied':'✓ Resumo copiado', 'split.saved':'✓ Salvo em “Quem me deve”', 'split.untitled':'Rolê', 'split.errNoDebt':'Atribua itens a pelo menos outra pessoa primeiro.', 'split.modeTotal':'Total', 'split.modeEach':'Cada', 'split.eachPh':'Cada',
    'debts.title':'🍻 Quem me deve', 'debts.toReceive':'A receber', 'debts.empty':'Racha uma conta para começar a controlar quem te deve.', 'debts.markPaid':'Marcar pago', 'debts.paid':'✓ Pago', 'debts.deleteOuting':'Excluir rolê', 'debts.delTitle':'Excluir este rolê?', 'debts.delMsg':'Isso remove a dívida de todo mundo dele.', 'debts.yourShare':'Sua parte',
    'tab.bills':'Contas e Metas', 'tab.budget':'Orçamento',

    'sum.income':'Receitas', 'sum.expenses':'Despesas', 'sum.balance':'Saldo',
    'sum.savingsRate':'Taxa de poupança', 'sum.loggedIncome':'Receita lançada',
    'sum.projectedCosts':'Custos projetados', 'sum.expectedBalance':'Saldo previsto',
    'sum.thisMonth':'neste mês', 'sum.netThisMonth':'líquido do mês',
    'sum.ofIncomeSaved':'da receita poupada', 'sum.inclBills':'inclui contas + poupança',
    'sum.txCount': v => v.n + (v.n===1?' lançamento':' lançamentos'),

    'sec.incomeVsBudget':'💵 Receita vs Orçamento', 'sec.spendingBreakdown':'📊 Distribuição dos gastos',
    'sec.thisWeek':'🗓 Esta semana — vence nos próximos 7 dias',
    'sec.transactions':'🧾 Lançamentos', 'sec.bills':'🔄 Contas',
    'sec.goals':'🎯 Metas de poupança', 'sec.bundles':'📨 Pacotes de pagamento', 'sec.budget':'📊 Orçamento',

    'worklog.hint':'💼 Jornada — toque nos dias trabalhados · toque num dia da semana para folgar · toque nas horas para editar',
    'worklog.logIncome':'Lançar como receita →',

    'action.add':'+ Adicionar', 'action.addShort':'Adicionar', 'action.markAllPaid':'Marcar tudo pago',
    'action.confirm':'Confirmar', 'action.cancel':'Cancelar', 'action.yes':'Sim',
    'action.save':'Salvar', 'action.done':'Pronto', 'action.saving':'Salvando…',

    'filter.allTypes':'Todos os tipos', 'filter.allCats':'Todas as categorias',
    'opt.income':'Receita', 'opt.expense':'Despesa',
    'sort.newest':'Mais recentes', 'sort.oldest':'Mais antigos',
    'sort.amtDesc':'Valor ↓', 'sort.amtAsc':'Valor ↑', 'sort.nameAz':'Nome A–Z',
    'sortbill.due':'Por vencimento', 'sortbill.name':'Nome A–Z',
    'sortbill.amtDesc':'Valor ↓', 'sortbill.amtAsc':'Valor ↑', 'sortbill.created':'Ordem de criação',

    'empty.noSpending':'Nenhum gasto neste mês ainda.',
    'empty.weekDash':'—',
    'empty.noTxAdd':'Nenhum lançamento neste mês. Toque em “+ Adicionar”.',
    'empty.noTxFilter':'Nenhum lançamento corresponde a estes filtros.',
    'empty.bills':'Toque em “+ Adicionar”. Deixe o campo de parcelas em branco para uma conta contínua, ou preencha para uma que termina.',
    'empty.goals':'Toque em “+ Adicionar” para criar uma meta.',
    'empty.bundles':'Agrupe contas e metas que você paga para a mesma pessoa e marque tudo de uma vez.',
    'empty.budget':'Toque em “+ Adicionar” para definir o orçamento de uma categoria.',
    'empty.noBudgetSuggest':'Ainda não há gastos por categoria para sugerir orçamentos neste período.',
    'empty.noHistory':'Histórico insuficiente para este período. Lance algumas despesas ou adicione contas fixas, e as sugestões aparecerão aqui.',
    'empty.bundleChecklist':'Adicione contas fixas ou metas primeiro.',
    'empty.noCats':'Nenhuma categoria ainda — adicione uma acima.',

    'fab.transaction':'💸 Lançamento', 'fab.bill':'🔄 Conta', 'fab.goal':'🎯 Meta',
    'fab.budget':'📊 Orçamento', 'fab.bundle':'📨 Pacote', 'fab.split':'🍻 Rachar conta',

    'f.type':'Tipo', 'f.date':'Data', 'f.description':'Descrição', 'f.category':'Categoria',
    'f.amount':'Valor', 'f.monthlyAmount':'Valor mensal', 'f.name':'Nome',
    'f.dueDay':'Dia do vencimento', 'f.recurring':'Recorrente?', 'f.installments':'Nº de parcelas (em branco = conta contínua)',
    'f.startsFrom':'Começa em', 'f.month':'Mês', 'f.goalName':'Nome da meta',
    'f.targetAmount':'Valor da meta', 'f.startingBalance':'Saldo inicial',
    'f.startingBalanceNote':' — a poupança planejada soma por cima',
    'f.deadline':'Prazo (opcional — a meta some depois que passa)', 'f.color':'Cor',
    'f.amountPerOcc':'Valor por ocorrência', 'f.howOften':'Com que frequência',
    'f.numMonths':'Nº de meses', 'f.startingMonth':'Mês inicial',
    'f.bundleName':'Nome do pacote', 'f.payee':'Pagar para (destinatário)', 'f.linkedItems':'Itens vinculados',
    'f.monthlyBudget':'Orçamento mensal',

    'type.expense':'💸 Despesa', 'type.income':'💰 Receita',
    'bill.recurring':'🔄 Recorrente', 'bill.onetime':'📌 Única',

    'amt.tx':'Valor (<span class="cur-sym"></span>)',
    'amt.monthly':'Valor mensal (<span class="cur-sym"></span>)',
    'amt.budget':'Orçamento mensal (<span class="cur-sym"></span>)',
    'amt.target':'Valor da meta (<span class="cur-sym"></span>)',
    'amt.startBal':'Saldo inicial (<span class="cur-sym"></span> — a poupança planejada soma por cima)',
    'amt.perOcc':'Valor por ocorrência (<span class="cur-sym"></span>)',

    'ph.txDesc':'ex.: Mercado, Salário…', 'ph.billName':'ex.: Netflix, Aluguel, Air Fryer…',
    'ph.dueDay':'1–31', 'ph.installments':'em branco = para sempre', 'ph.goalName':'ex.: Reserva de emergência',
    'ph.numMonths':'ex.: 6', 'ph.bundleName':'ex.: Devo ao João', 'ph.payee':'ex.: João, Mãe…',
    'ph.newCat':'ex.: 🎸 Música', 'ph.actualAmount':'Valor real', 'ph.hours':'Horas',
    'ph.amount':'0,00',

    'tx.add':'Adicionar lançamento', 'tx.edit':'Editar lançamento',
    'tx.save':'Salvar lançamento', 'tx.update':'Atualizar lançamento', 'tx.delete':'Excluir lançamento',
    'bill.add':'Adicionar conta', 'bill.edit':'Editar conta', 'bill.save':'Salvar conta',
    'bill.update':'Atualizar conta', 'bill.delete':'Excluir conta',
    'budget.add':'Adicionar categoria de orçamento', 'budget.edit':'Editar categoria de orçamento',
    'budget.save':'Salvar orçamento', 'budget.update':'Atualizar orçamento', 'budget.delete':'Excluir categoria',
    'goal.add':'Adicionar meta de poupança', 'goal.edit':'Editar meta de poupança',
    'goal.save':'Salvar meta', 'goal.update':'Atualizar meta', 'goal.delete':'Excluir meta',
    'alloc.add':'Planejar uma poupança', 'alloc.edit':'Editar plano de poupança', 'alloc.save':'Salvar plano de poupança',
    'alloc.update':'Atualizar plano de poupança', 'alloc.delete':'Excluir plano de poupança', 'alloc.subDefault':'Para sua meta',
    'alloc.skipMonth':'Pular este mês', 'alloc.editPlan':'Editar plano', 'alloc.amtPrompt':'Valor deste mês (planejado {amt})', 'alloc.planned':'planejado {x}',
    'bundle.add':'Adicionar pacote de pagamento', 'bundle.edit':'Editar pacote de pagamento',
    'bundle.save':'Salvar pacote', 'bundle.update':'Atualizar pacote', 'bundle.delete':'Excluir pacote',

    'alloc.opt.monthly':'Todo mês (contínuo)', 'alloc.opt.once':'Uma vez', 'alloc.opt.fixed':'Número fixo de meses',

    'set.title':'⚙️ Configurações', 'set.tabIncome':'Receita', 'set.tabCats':'Categorias',
    'set.tabThemes':'Temas', 'set.tabLang':'Idioma',
    'set.payModel':'Modelo de pagamento', 'set.hourly':'⏱ Por hora', 'set.salaried':'📅 Salário',
    'set.hourlyRate':'Valor por hora', 'set.monthlySalary':'Salário mensal',
    'set.stdHours':'Horas padrão por dia', 'set.overtime':'Hora extra',
    'set.otMult':'Multiplicador de hora extra (× valor base)', 'set.currency':'Moeda',
    'set.singleCur':'Moeda única', 'set.convert':'Converter', 'set.paidIn':'Recebido em',
    'set.trackIn':'Acompanhar e exibir em', 'set.exchRate':'Taxa de câmbio',
    'set.saveIncome':'Salvar configurações de receita',
    'set.hourlyRateCur':'Valor por hora (<span class="cur-from-lbl">USD</span>)',
    'set.monthlySalaryCur':'Salário mensal (<span class="cur-from-lbl">USD</span>)',
    'set.exchRateCur':'Taxa de câmbio (<span id="setExchLbl">to per from</span>)',
    'set.catHint':'Novas categorias recebem uma cor automática — toque numa cor para mudar. Ao excluir uma, seus lançamentos ficam como “Sem categoria”.',
    'set.themeHint':'Escolha um visual abaixo. Alterne claro/escuro nas configurações ou no botão lua/sol do topo.',
    'set.langHint':'Escolha o idioma do app inteiro. Isso muda rótulos e mensagens — seus dados continuam os mesmos.',
    'ot.off':'Desligado — horas extras pagas no valor normal', 'ot.auto':'Automático — pago acima do esperado mensal',
    'ot.manual':'Manual — marcar hora extra por dia',
    'set.exchUnit': v => v.to + ' por ' + v.from,

    'ask.title':'Tem certeza?',
    'cc.title':'Marcar como pago', 'cc.paidToday':'Pago hoje', 'cc.backThen':'Na época',
    'cc.noDiffered':'Não, foi diferente',
    'cc.wasAmount': v => 'O valor foi mesmo <strong>' + v.amt + '</strong>?',
    'cc.backInMonth': v => 'Em ' + v.month,
    'grp.title':'Confirmar pagamentos', 'grp.whenLeave':'Quando isso saiu da sua conta?',
    'grp.backIn':'Em', 'grp.adjust':'Ajustar valores', 'grp.markAllBills':'Marcar todas as contas pagas',
    'grp.totalCap':'total a marcar como pago',
    'grp.itemsMonth': v => v.n + (v.n===1?' item':' itens') + ' · ' + v.month,

    'toast.saved':'✓ Salvo!', 'toast.updated':'✓ Atualizado', 'toast.updated2':'✓ Atualizado!',
    'toast.deleted':'🗑 Excluído', 'toast.budgetSet':'✓ Orçamento definido', 'toast.markedPaid':'✓ Marcado como pago',
    'toast.allPaid':'Todas as contas já estão marcadas como pagas neste mês.',
    'toast.nothingPaid':'Nada para marcar como pago.', 'toast.noIncome':'Nenhuma receita para lançar neste mês.',
    'toast.incomeSaved':'✓ Configurações de receita salvas!', 'toast.catRenamed':'✓ Categoria renomeada',
    'toast.catAdded':'✓ Categoria adicionada', 'toast.catDeleted':'🗑 Categoria excluída',
    'toast.langSet':'✓ Idioma atualizado',
    'toast.theme': v => '✓ Tema · ' + v.name,
    'toast.loggedTo': v => '✓ Lançado em ' + v.month + '! (' + v.amt + ')',
    'toast.otLogged': v => '✓ ' + v.h + ' lançadas como hora extra',
    'toast.paidActual': v => '✓ Pago · real ' + v.amt,
    'toast.nMarkedPaid': v => '✓ ' + v.n + (v.n===1?' marcado como pago':' marcados como pagos'),

    'err.prefix':'Erro: ', 'err.allFields':'Preencha todos os campos.',
    'err.billFields':'Preencha nome, valor e dia do vencimento (1–31).',
    'err.budgetFields':'Escolha uma categoria e um valor.',
    'err.goalFields':'Informe um nome e o valor da meta.',
    'err.amount':'Informe um valor.', 'err.numMonths':'Informe o número de meses.',
    'err.bundleName':'Dê um nome ao pacote.', 'err.bundleItems':'Selecione pelo menos um item para vincular.',
    'err.validHours':'Informe um número de horas válido.', 'err.validAmount':'Informe um valor válido.',
    'err.catName':'Digite um nome de categoria (emoji é bem-vindo).', 'err.catExists':'Essa categoria já existe.',
    'err.stdHours':'As horas padrão por dia devem ser maiores que 0.',
    'err.hourlyRate':'Informe seu valor por hora.', 'err.salary':'Informe seu salário mensal.',
    'err.exchRate':'Informe uma taxa de câmbio válida.',
    'err.catExistsNamed': v => 'Já existe uma categoria chamada “' + v.name + '”.',

    'confirm.deleteItemTitle':'Excluir este item?', 'confirm.cantUndo':'Isso não pode ser desfeito.', 'confirm.deleteCanUndo':'Dá pra desfazer logo em seguida.', 'billdel.title':'Excluir esta conta recorrente?', 'billdel.month':'Só este mês', 'billdel.onwards':'Deste mês em diante', 'billdel.all':'Todos os meses', 'billamt.title':'Como aplicar o novo valor?', 'toast.billSkipped':'✓ Oculta neste mês', 'toast.billStopped':'✓ Encerrada deste mês em diante', 'toast.billAmtMonth':'✓ Valor atualizado neste mês', 'toast.billAmtOnwards':'✓ Novo valor deste mês em diante', 'toast.allocSkipped':'✓ Pulado neste mês', 'toast.allocAmtMonth':'✓ Valor atualizado neste mês',
    'confirm.catTitle':'Excluir categoria?',
    'confirm.catDelete': v => 'Excluir “' + v.name + '”? Isso não pode ser desfeito.',
    'confirm.catUsed': v => '“' + v.name + '” é usada por ' + v.txN + (v.txN!==1?' lançamentos':' lançamento') + ' e ' + v.blN + (v.blN!==1?' contas':' conta') + '.\nEles ficarão como Sem categoria até serem reatribuídos.',

    'cat.uncategorized':'Sem categoria', 'cat.uncatDash':'— Sem categoria —',
    'cat.uncatWas': v => 'Sem categoria (era ' + v.name + ')',

    'trend.over': v => '⚠ acima do orçamento há ' + v.n + ' meses — talvez aumentar',
    'trend.trendingOver': v => 'tendência de estourar · ~' + v.avg + '/mês',
    'trend.room': v => 'bastante folga · ~' + v.avg + '/mês em média',
    'trend.onTrack': v => 'dentro do previsto · ~' + v.avg + '/mês em média',
    'suggest.more':'Mais dos seus gastos', 'suggest.suggested':'Sugerido pelos seus gastos recentes',
    'suggest.perMo': v => '~' + v.avg + '/mês', 'suggest.set': v => 'Definir ' + v.amt,

    'bd.spent': v => 'Gasto ' + v.x, 'bd.toCome': v => 'Ainda por vir ' + v.x,
    'bd.subBoth': v => v.spent + ' gasto · ' + v.proj + ' por vir', 'bd.subSpent': v => v.spent + ' gasto',

    'cal.summary': v => '<strong>' + v.days + '</strong> dias · <strong>' + v.hours + '</strong> trabalhadas',
    'cal.expected': v => ' · esperado <strong>' + v.hours + '</strong>',
    'cal.ot': v => ' · <strong style="color:var(--warning)">' + v.hours + ' extra</strong>',
    'cal.baseOt': v => 'base ' + v.base + '  +  extra ' + v.ot,
    'ot.promptQ': v => 'Você lançou <strong>' + v.h + '</strong> acima do esperado. Pagar como hora extra?',

    'tx.salaryDesc': v => 'Salário — ' + v.month + ' ' + v.year,
    'src.savings':'poupança', 'src.bill':'conta',

    'bill.dayN': v => 'Dia ' + v.d, 'bill.dueToday':'Vence hoje!', 'bill.inDays': v => 'Em ' + v.n + ' dias',
    'bill.onetimeMeta':'única',
    'bill.installMeta': v => v.num + ' de ' + v.total + ' · ' + v.pct + '%',
    'bill.actualEst': v => 'real · est. ' + v.x,
    'preview.onetimeAmt': v => 'Única · <strong>' + v.amt + '</strong> em ' + v.month,
    'preview.onetimeNo': v => 'Conta única, cobrada uma vez em ' + v.month,
    'preview.installment': v => 'Total <strong>' + v.total + '</strong> em ' + v.n + ' meses · termina em ' + v.month,

    'goal.daysLeft': v => v.n + ' dias restantes · ' + v.date, 'goal.dueToday':'🔔 Vence hoje!',
    'goal.of': v => 'de ' + v.x, 'goal.planSaving':'+ Planejar poupança',
    'alloc.lbl.monthly':'mensal', 'alloc.lbl.once':'única',
    'alloc.toward': v => 'Para: ' + v.name, 'misc.goal':'(meta)',
    'misc.removed':'(removido)', 'misc.unknown':'(desconhecido)',

    'bundle.savingsTo': v => '💰 Poupança → ' + v.goal, 'bundle.noActive':'Nenhum item ativo neste mês',
    'bundle.paidCount': v => v.paid + '/' + v.total + ' pago',

    'ivb.noIncome': v => 'Nenhuma receita lançada neste mês ainda. Seu plano compromete <strong style="color:var(--text)">' + v.committed + '</strong>' + v.detail + ' Lance a receita para ver como ela se encaixa.',
    'ivb.commitsDetail': v => ' (' + v.budgets + ' em orçamentos + ' + v.savings + ' em poupança).',
    'ivb.budgets': v => 'Orçamentos ' + v.x, 'ivb.savings': v => 'Poupança ' + v.x,
    'ivb.headroom': v => 'Folga ' + v.x, 'ivb.over': v => 'Excedido ' + v.x,
    'ivb.plannedSavings':'💰 Poupança planejada', 'ivb.expectedIncome':'Receita prevista',
    'ivb.basedLast':'com base no mês passado', 'ivb.overIncome':'acima da sua receita', 'ivb.unallocated':'não alocado',
    'ivb.incomeTitle': v => 'Receita: ' + v.x,

    'digest.thisMonth':'este mês', 'digest.savingsTo': v => 'Poupança → ' + v.goal,
    'digest.overdueHead':'⚠️ Em atraso — ainda não marcado', 'digest.dueHead':'Vence nos próximos 7 dias',
    'digest.overdue':'em atraso', 'digest.dueToday':'Vence hoje', 'digest.tomorrow':'Amanhã',
    'digest.inDays': v => 'Em ' + v.n + ' dias', 'digest.allClear':'Nada vencendo ou em atraso. 🎉',

    'mom.same':'≈ igual', 'mom.vsLast': v => 'vs ' + v.x + ' mês passado',

    'theme.active':'✓ Ativo', 'theme.apply':'Toque para aplicar',
    'theme.mood.default':'Clean · claro e escuro', 'theme.mood.vault':'Escuro · banco privado',
    'theme.mood.garden':'Quente · orgânico', 'theme.mood.aperture':'Claro · minimalista',
    'theme.mood.arcade':'Neon · retrô-futuro', 'theme.mood.sorbet':'Claro · pastel', 'theme.mood.press':'Claro · editorial', 'theme.mood.mint':'Claro · menta',
    'lang.en':'English', 'lang.ptBR':'Português (Brasil)',
    'wizard.welcome':'Bem-vindo(a) 👋', 'wizard.step': v => 'Passo ' + v.n + ' de 3',
    'wizard.step1Title':'Escolha seu idioma', 'wizard.step1Sub':'Você pode mudar quando quiser nas Configurações.',
    'wizard.step2Title':'Moeda', 'wizard.step2Sub':'Como seu dinheiro é exibido no app.',
    'wizard.convertQ':'Você ganha e gasta em moedas diferentes?',
    'wizard.step3Title':'Como você recebe', 'wizard.step3Sub':'Usado pela Jornada para estimar sua receita.',
    'wizard.next':'Avançar', 'wizard.back':'Voltar', 'wizard.finish':'Concluir · Bora', 'wizard.skip':'Pular por enquanto', 'wizard.done':'✓ Tudo pronto!',
    'sheet.title':'Configure sua planilha', 
    'sheet.sub':'Seus dados ficam na sua própria planilha do Google, no seu Drive. Crie uma agora — leva só um instante.',
    'sheet.create':'Criar minha planilha', 'sheet.creating':'Criando…',
    'sheet.haveOne':'Já tenho uma planilha', 'sheet.linkLabel':'Cole o link da sua planilha',
    'sheet.linkPh':'https://docs.google.com/spreadsheets/…', 'sheet.linkBtn':'Vincular', 'sheet.linking':'Vinculando…',
    'sheet.created':'✓ Planilha pronta!', 'sheet.linkErr':'Não consegui abrir essa planilha — verifique o link e se você tem acesso.',
    'settled.badge':'✓ Tudo quitado este mês', 'ph.search':'Buscar lançamentos…',
    'set.tabData':'Dados', 'export.hint':'Salve um backup completo de todos os seus dados em CSV no seu Google Drive.',
    'export.btn':'Exportar backup', 'export.working':'Exportando…', 'export.done':'✓ Backup salvo no seu Drive', 'export.open':'Abrir arquivo',
    'tour.start':'Fazer um tour rápido', 'tour.step': v => 'Passo ' + v.n + ' de ' + v.total,
    'tour.next':'Avançar', 'tour.back':'Voltar', 'tour.done':'Entendi', 'tour.skip':'Pular tour',
    'tour.welcomeT':'Bem-vindo(a)! 👋', 'tour.welcomeB':'Um tour rápido pelas cinco seções — pode pular quando quiser.',
    'tour.overviewT':'Visão geral', 'tour.overviewB':'Seu mês num relance: receitas, despesas, distribuição de gastos e o que vence nesta semana.',
    'tour.worklogT':'Jornada', 'tour.worklogB':'Toque nos dias trabalhados — o app transforma suas horas em receita para lançar.',
    'tour.moneyT':'Dinheiro', 'tour.moneyB':'Todos os seus lançamentos, além da comparação com o mês passado.',
    'tour.billsT':'Contas e Metas', 'tour.billsB':'Contas recorrentes, metas de poupança e pacotes de pagamento — marque conforme paga.',
    'tour.budgetT':'Orçamento', 'tour.budgetB':'Defina orçamentos mensais por categoria e receba sugestões dos seus gastos.',
    'tour.addT':'Adicione rápido', 'tour.addB':'Este botão + adiciona um lançamento, conta, meta, orçamento ou pacote.',
    'tour.settingsT':'Configurações', 'tour.settingsB':'Seu pagamento, moeda, categorias, temas, idioma — e a exportação de backup.',
    'savings.title':'Poupança total', 'savings.hint':'Toque para editar', 'savings.saved':'✓ Poupança atualizada',
    'salary.add':'Adicionar salário todo mês', 'salary.remove':'Remover deste mês em diante',
    'salary.recurring': v => 'Salário recorrente · ' + v.amt + '/mês',
    'salary.addHint': v => 'Aplicar a receita deste mês (' + v.amt + ') a todo mês',
    'salary.none':'Nenhuma receita calculada ainda — registre seus dias trabalhados primeiro.',
    'salary.added':'✓ Salário recorrente definido', 'salary.removed':'✓ Salário encerrado deste mês em diante', 'salary.auto':'auto',
    'savings.general':'Poupança geral', 'savings.deposit':'Depositar', 'savings.withdraw':'Sacar',
    'savings.depositTitle':'Depositar na poupança', 'savings.withdrawTitle':'Sacar da poupança',
    'savings.depositDesc':'Depósito na poupança', 'savings.withdrawDesc':'Saque da poupança',
    'savings.deposited':'✓ Adicionado à poupança', 'savings.withdrew':'✓ Sacado da poupança',
    'savings.empty':'Nenhuma poupança recorrente ainda. Toque em “+ Planejar poupança”.',
    'fb.titleBug':'Reportar um bug', 'fb.titleFeature':'Sugerir um recurso', 'fb.type':'Tipo',
    'fb.bug':'🐛 Bug', 'fb.feature':'💡 Recurso', 'fb.message':'Mensagem',
    'fb.ph':'Descreva — o que aconteceu, ou o que você gostaria…',
    'fb.send':'Enviar', 'fb.sent':'✓ Obrigado! Enviado.', 'fb.empty':'Escreva uma mensagem curta primeiro.',
    'fb.reportBug':'🐛 Reportar um bug', 'fb.requestFeature':'💡 Sugerir um recurso', 'fb.open':'💬 Enviar feedback', 'fb.name':'Nome', 'fb.namePh':'Seu nome', 'footer.rights':'Todos os direitos reservados.', 'acct.switch':'Trocar', 'acct.logout':'Sair', 'acct.hint':'Toque em Sair para trocar de conta do Google.',
    'runway.label': v => '≈ ' + v.n + ' meses de reserva', 'goal.eta': v => '🎯 atinge ~' + v.date,
    'sec.trend':'📈 Gastos — últimos 6 meses',
    'recap.open':'📋 Resumo do mês', 'recap.saved':'Poupado', 'recap.top':'Maiores categorias', 'recap.none':'Sem gastos neste mês.',
    'toast.undo':'Desfazer', 'toast.restored':'↩ Restaurado',
    'imp.open':'Importar lançamentos', 'imp.hint':'Cole um por linha: Data, Descrição, Valor, Categoria, Tipo — separados por tab ou vírgula. Data como AAAA-MM-DD; use ponto para decimais (120.50). Dica: copie as linhas direto de uma planilha.',
    'imp.ph':'2026-06-15, Mercado, 120.50, 🍔 Alimentação, Expense', 'imp.btn':'Importar', 'imp.importing':'Importando…',
    'imp.done': v => '✓ ' + v.n + ' importados', 'imp.none':'Nada válido para importar — verifique o formato.',
  }
};
function lang(){ const l = DATA && DATA.settings && DATA.settings.lang; return (l==='en'||l==='ptBR') ? l : 'ptBR'; }
function L(){ return lang()==='en' ? 'en-US' : 'pt-BR'; }
function wdNames(){ return I18N[lang()].weekdays; }
function mnNames(){ return I18N[lang()].monthsShort; }
function t(key, vars){
  const dict = I18N[lang()] || I18N.ptBR;
  let v = (key in dict) ? dict[key] : I18N.en[key];
  if (v == null) return key;
  if (typeof v === 'function') return v(vars || {});
  if (vars) v = String(v).replace(/\{(\w+)\}/g, (m,k)=> (vars[k]!=null ? vars[k] : m));
  return v;
}
function applyStaticI18n(){
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'))); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.setAttribute('title', t(el.getAttribute('data-i18n-title'))); });
  var _f=document.getElementById('appFooter'); if (_f) _f.textContent = '© ' + new Date().getFullYear() + ' Joel Soluções LTDA · ' + t('footer.rights');
  document.documentElement.lang = lang()==='en' ? 'en' : 'pt-BR';
  var _hb=document.getElementById('hubBtn'); if (_hb) _hb.style.display = (HUB_URL && HUB_URL.indexOf('PASTE_HUB_URL') < 0) ? '' : 'none';
}
function goToHub(){ if (HUB_URL) window.location.href = HUB_URL; }
function setLang(l){
  if (!DATA.settings) DATA.settings = {};
  DATA.settings.lang = (l==='en') ? 'en' : 'ptBR';
  applyStaticI18n(); populateCategoryDropdowns(); renderAll(); renderThemePicker(); renderLangPicker(); csSyncAll();
  jbRun('saveSetting', 'lang', DATA.settings.lang).catch(function(e){ showToast(t('err.prefix')+e.message,'error'); });
  showToast(t('toast.langSet'));
}
function renderLangPicker(){
  const el = document.getElementById('langGrid'); if (!el) return;
  const cur = lang();
  const langs = [{id:'ptBR', flag:'🇧🇷'}, {id:'en', flag:'🇺🇸'}];
  el.innerHTML = langs.map(L0 => {
    const on = L0.id===cur;
    return '<button class="lang-card'+(on?' active':'')+'" onclick="setLang(\''+L0.id+'\')">'
      + '<span class="lang-flag">'+L0.flag+'</span>'
      + '<span class="lang-name">'+t('lang.'+L0.id)+'</span>'
      + '<span class="lang-state">'+(on?t('theme.active'):t('theme.apply'))+'</span>'
      + '</button>';
  }).join('');
}
/* ==================== end i18n ENGINE ==================== */

/* ---- Feedback Google Form. Fill these in, then submissions post straight to your form.
   Setup: 1) make a Form with a "Type" question (short answer) + a "Message" question (paragraph).
   2) Responses tab → ⋮ → "Get email notifications for new responses".
   3) ⋮ → "Get pre-filled link", fill dummy answers, "Get link" — the URL holds entry.NNN for each field.
   4) Paste the form id and the two entry ids below. ---- */
// Public home of the app — the Google Site that embeds it. Used to route the account switcher.
const APP_HOME = 'https://sites.google.com/view/financeboard/financeboard';
// Joel App hub — paste the hub's deployed URL here. While it's the placeholder, the 🚪 hub button stays hidden.
// The hub's Home page. The door opens it in a new tab (this app runs inside the Sites
// embed, so in-place top navigation is blocked).
const HUB_URL = '/';
const FEEDBACK_FORM = {
  action: 'https://docs.google.com/forms/d/e/1FAIpQLSdfIXwvv96V8E2aMsS0Yu9AlugAy0NZ7-eAklGisFO6cuSCuA/formResponse',
  nameEntry: 'entry.2102774097',   // the "Name" field
  kindEntry: 'entry.1066607309',   // the "Type" field
  msgEntry:  'entry.315076588'     // the "Message" field
};
const FALLBACK_CATS = ['🍔 Food & Groceries','🚌 Transport','🏠 Housing & Utilities','🎬 Entertainment','💊 Health','🛍️ Shopping','💼 Salary','💻 Freelance','✂️ Personal Care','🙏 Spiritual','📚 Education','💡 Bills','🎮 Games & Tech','❓ Other'];
function fallbackCats(){ return (I18N[lang()]||I18N.ptBR).fallbackCats || FALLBACK_CATS; }
const CAT_COLORS = {'🍔 Food & Groceries':'#f59e0b','🚌 Transport':'#3b82f6','🏠 Housing & Utilities':'#8b5cf6','🎬 Entertainment':'#ec4899','💊 Health':'#10b981','🛍️ Shopping':'#f97316','💼 Salary':'#34d399','💻 Freelance':'#2dd4bf','✂️ Personal Care':'#a78bfa','🙏 Spiritual':'#fbbf24','📚 Education':'#60a5fa','💡 Bills':'#94a3b8','🎮 Games & Tech':'#e879f9','❓ Other':'#6b7280','💰 Savings':'#22d3ee','🍔 Alimentação':'#f59e0b','🚌 Transporte':'#3b82f6','🏠 Moradia e Contas':'#8b5cf6','🎬 Entretenimento':'#ec4899','💊 Saúde':'#10b981','🛍️ Compras':'#f97316','💼 Salário':'#34d399','✂️ Cuidados Pessoais':'#a78bfa','🙏 Espiritual':'#fbbf24','📚 Educação':'#60a5fa','💡 Contas':'#94a3b8','🎮 Jogos e Tecnologia':'#e879f9','❓ Outros':'#6b7280','💰 Poupança':'#22d3ee','Uncategorized':'#475569'};
/* weekday labels provided by wdNames() (i18n) */
let CAT_OVERRIDES = {};
function rebuildCatColors() { CAT_OVERRIDES = {}; ((DATA && DATA.categories) || []).forEach(c => { if (c.color) CAT_OVERRIDES[c.name] = c.color; }); }
function activeCatNames() { const a = ((DATA && DATA.categories) || []).map(c=>c.name); return a.length ? a : fallbackCats(); }
function categoryNames() { return activeCatNames(); }
function knownCat(c) { return !!c && activeCatNames().indexOf(c) > -1; }
function catLabel(c) { return knownCat(c) ? c : t('cat.uncategorized'); }
function catColor(c) {
  if (!c || c==='Uncategorized' || c===t('cat.uncategorized')) return CAT_COLORS['Uncategorized'];
  if (CAT_OVERRIDES[c]) return CAT_OVERRIDES[c];
  return CAT_COLORS[c] || '#' + Math.abs([...(c||'')].reduce((h,ch)=>(h<<5)-h+ch.charCodeAt(0),0)).toString(16).slice(0,6).padStart(6,'0');
}

const now = new Date();
let DATA = null, selY = now.getFullYear(), selM = now.getMonth(), txType = 'Expense', fabOpen = false, billRecur = true;
let editing = { type: null, id: null }, editingHoursDate = null, allocGoalId = null, SUGG = [], confirmCtx = null, currentTab = 'overview', editingCatId = null, askCb = null, pickYear = now.getFullYear(), revealedMonths = jbLoadSet('jb_fin_reveal'), hiddenMonths = jbLoadSet('jb_fin_hide');
var worklogDirty=false, wizSalaryAmt=0;

/* Pure helpers from finance-math.js (also unit-tested in tests/finance-math.test.mjs). */
var ymStr = FinMath.ymStr, dayStr = FinMath.dayStr, monthDiff = FinMath.monthDiff, ymAdd = FinMath.ymAdd;
var parseAmount = FinMath.parseAmount, round2 = FinMath.round2, itemTotal = FinMath.itemTotal;
var itemUnit = FinMath.itemUnit, sumAssign = FinMath.sumAssign;

window.addEventListener('DOMContentLoaded', () => {
  applyStaticI18n();
  setDefaultDate();
  document.addEventListener('click', e => { const w=document.querySelector('.month-picker-wrap'); if (w && !w.contains(e.target)) closeMonthPicker(); });
  jbStartAuth();
});

function boot(data) {
  if (data && data.needsSetup) { showSheetGate(); return; }
  DATA = data;
  rebuildCatColors();
  migrateFinanceTheme();
  applyFinanceTheme();
  applyStaticI18n();
  populateCategoryDropdowns();
  renderAll();
  csEnhanceAll();
  enhanceMonthsAll();
  if (!window._kbInit) { window._kbInit = 1; document.addEventListener('keydown', ccKeydown); document.addEventListener('keydown', globalKeys); }
  document.getElementById('loading').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  if (!profileIsSet()) startWizard();
  if (!window._jbTabSync) { window._jbTabSync = 1; JB.onTabVisible(function(){ if (document.getElementById('app').style.display !== 'none') reload(); }); JB.watchSheet('finance', reload); }
}
function reload() { jbLoad().then(function(d){ DATA = d; rebuildCatColors(); populateCategoryDropdowns(); renderAll(); renderCatList(); }).catch(function(e){ showToast(t('err.prefix')+e.message,'error'); }); }
function manualRefresh() {
  const btn = document.getElementById('refreshBtn');
  if (btn.classList.contains('spinning')) return;
  btn.classList.add('spinning');
  jbLoad().then(function(d){ DATA = d; rebuildCatColors(); populateCategoryDropdowns(); renderAll(); renderCatList(); btn.classList.remove('spinning'); showToast(t('toast.updated')); }).catch(function(e){ btn.classList.remove('spinning'); showToast(t('err.prefix')+e.message, 'error'); });
}

// Rebuild the choosable category dropdowns from live data (preserving the Money filter).
function populateCategoryDropdowns() {
  const names = categoryNames();
  const opts = names.map(n=>'<option value="'+n+'">'+n+'</option>').join('');
  ['txCat','budCat','billCat'].forEach(id => { const sel=document.getElementById(id); if(!sel) return; const prev=sel.value; sel.innerHTML=opts; if(names.indexOf(prev)>-1) sel.value=prev; });
  const f=document.getElementById('txFilterCat');
  if (f) { const prev=f.value; f.innerHTML='<option value="">'+t('filter.allCats')+'</option>'+opts; f.value=(names.indexOf(prev)>-1?prev:''); }
  ['txCat','budCat','billCat','txFilterCat'].forEach(csSync);
}
// Select a category in a dropdown, preserving an orphaned/blank value via a temp option
// so saving an edited record never silently re-categorizes it.
function selectCategory(id, value) {
  const sel=document.getElementById(id); if(!sel) return;
  [...sel.options].forEach(o=>{ if(o.dataset.temp) o.remove(); });
  if (!value) { const o=document.createElement('option'); o.value=''; o.textContent=t('cat.uncatDash'); o.dataset.temp='1'; sel.insertBefore(o, sel.firstChild); }
  else if (!knownCat(value)) { const o=document.createElement('option'); o.value=value; o.textContent=t('cat.uncatWas',{name:value}); o.dataset.temp='1'; sel.insertBefore(o, sel.firstChild); }
  sel.value = value || '';
  csSync(id);
}
function resetCategorySelect(id) { const s=document.getElementById(id); if(!s) return; [...s.options].forEach(o=>{ if(o.dataset.temp) o.remove(); }); s.selectedIndex=0; csSync(id); }

/* ---- Custom dropdown: native <select> stays as source of truth, hidden; themed UI on top ---- */
let csOpen = null;
function enhanceSelect(sel) {
  if (sel._cs) return; sel._cs = true;
  const mini = sel.classList.contains('mini');
  const wrap = document.createElement('span'); wrap.className = 'cs-wrap ' + (mini?'cs-wrap-mini':'cs-wrap-full');
  sel.parentNode.insertBefore(wrap, sel); wrap.appendChild(sel); sel.classList.add('cs-native');
  const trig = document.createElement('button'); trig.type='button'; trig.className = 'cs-trigger ' + (mini?'cs-mini':'cs-full');
  const lab = document.createElement('span'); lab.className='cs-label';
  const chev = document.createElement('span'); chev.className='cs-chev';
  trig.appendChild(lab); trig.appendChild(chev); wrap.appendChild(trig);
  const menu = document.createElement('div'); menu.className='cs-menu';
  let items = [], active = -1, typeBuf = '', typeTO = null;
  function sync(){ const o=sel.options[sel.selectedIndex]; lab.textContent = o?o.textContent:''; }
  function build(){ menu.innerHTML=''; items=[]; Array.from(sel.options).forEach((o,i)=>{ const it=document.createElement('div'); it.className='cs-item'+(i===sel.selectedIndex?' sel':''); it.textContent=o.textContent; it.addEventListener('click',ev=>{ ev.stopPropagation(); choose(i); }); it.addEventListener('mousemove',()=>setActive(i)); menu.appendChild(it); items.push(it); }); }
  function setActive(i){ if(active>=0&&items[active]) items[active].classList.remove('active'); active=i; if(items[active]){ items[active].classList.add('active'); items[active].scrollIntoView({block:'nearest'}); } }
  function choose(i){ sel.selectedIndex=i; sync(); close(); sel.dispatchEvent(new Event('change',{bubbles:true})); }
  function place(){ const r=trig.getBoundingClientRect(); menu.style.minWidth=r.width+'px'; menu.style.left=r.left+'px'; menu.style.top='0px'; menu.style.visibility='hidden'; document.body.appendChild(menu); const h=menu.offsetHeight; let top=r.bottom+6; if (top+h>window.innerHeight-8 && r.top-h-6>8) top=r.top-h-6; menu.style.top=top+'px'; menu.style.visibility='visible'; }
  function open(){ if(csOpen)csOpen(); build(); place(); trig.classList.add('open'); setActive(sel.selectedIndex); csOpen=close; setTimeout(()=>{ document.addEventListener('click',onDoc,true); window.addEventListener('scroll',onScroll,true); window.addEventListener('resize',close,true); },0); }
  function close(){ if(menu.parentNode)menu.parentNode.removeChild(menu); trig.classList.remove('open'); if(csOpen===close)csOpen=null; document.removeEventListener('click',onDoc,true); window.removeEventListener('scroll',onScroll,true); window.removeEventListener('resize',close,true); }
  function onDoc(e){ if(!menu.contains(e.target)&&!trig.contains(e.target)) close(); }
  function onScroll(e){ if(menu.contains(e.target)) return; close(); }
  trig.addEventListener('click',e=>{ e.stopPropagation(); trig.classList.contains('open')?close():open(); });
  trig.addEventListener('keydown',e=>{
    const isOpen = trig.classList.contains('open');
    if (!isOpen) { if (['ArrowDown','ArrowUp','Enter',' '].includes(e.key)) { e.preventDefault(); open(); } return; }
    if (e.key==='ArrowDown') { e.preventDefault(); e.stopPropagation(); setActive(Math.min((active<0?-1:active)+1, items.length-1)); }
    else if (e.key==='ArrowUp') { e.preventDefault(); e.stopPropagation(); setActive(Math.max((active<0?items.length:active)-1, 0)); }
    else if (e.key==='Home') { e.preventDefault(); e.stopPropagation(); setActive(0); }
    else if (e.key==='End') { e.preventDefault(); e.stopPropagation(); setActive(items.length-1); }
    else if (e.key==='Enter') { e.preventDefault(); e.stopPropagation(); if(active>=0) choose(active); }
    else if (e.key==='Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key.length===1 && /\S/.test(e.key)) { e.stopPropagation(); typeBuf+=e.key.toLowerCase(); clearTimeout(typeTO); typeTO=setTimeout(()=>typeBuf='',700); const idx=Array.from(sel.options).findIndex(o=>o.textContent.toLowerCase().indexOf(typeBuf)===0); if(idx>=0) setActive(idx); }
  });
  sel.addEventListener('change', sync);
  sel._csSync = sync; sync();
}
function csSync(id){ const s=document.getElementById(id); if(s&&s._csSync) s._csSync(); }
function csEnhanceAll(){ document.querySelectorAll('select').forEach(enhanceSelect); }
/* ---- Custom month picker (cross-browser; native type=month is unsupported in Safari/Firefox) ---- */
let mOpen = null;
function fmtMonthLabel(ym){ const a=ym.split('-').map(Number); return new Date(a[0], a[1]-1, 1).toLocaleString(L(), {month:'long', year:'numeric'}); }
function enhanceMonth(inp){
  if(inp._m) return; inp._m=true;
  const wrap=document.createElement('span'); wrap.className='mfield';
  inp.parentNode.insertBefore(wrap, inp); wrap.appendChild(inp);
  const trig=document.createElement('button'); trig.type='button'; trig.className='field mfield-trig'; wrap.appendChild(trig);
  const pop=document.createElement('div'); pop.className='mfield-pop';
  let viewYear;
  const valid=()=> inp.value && /^\d{4}-\d{2}$/.test(inp.value);
  function sync(){ trig.innerHTML = valid() ? ('<span>'+fmtMonthLabel(inp.value)+'</span>') : ('<span class="ph-faded">'+new Date(selY,selM,1).toLocaleString(L(),{month:'long',year:'numeric'})+'</span>'); }
  function build(){
    const MN=mnNames();
    const sa = valid()? inp.value.split('-').map(Number):null;
    pop.innerHTML='<div class="mp-year"><button type="button" data-d="-1">‹</button><span class="mfy">'+viewYear+'</span><button type="button" data-d="1">›</button></div><div class="mp-grid">'
      + MN.map((m,i)=>{ const sel=sa&&sa[0]===viewYear&&sa[1]-1===i, cur=(viewYear===now.getFullYear()&&i===now.getMonth());
        return '<button type="button" class="mp-month'+(sel?' sel':'')+(cur?' cur':'')+'" data-m="'+i+'">'+m+'</button>'; }).join('') + '</div>';
    pop.querySelectorAll('.mp-year button').forEach(b=>b.addEventListener('click',e=>{ e.stopPropagation(); viewYear+=Number(b.dataset.d); build(); }));
    pop.querySelectorAll('.mp-month').forEach(b=>b.addEventListener('click',e=>{ e.stopPropagation(); choose(viewYear, Number(b.dataset.m)); }));
  }
  function choose(y,m){ inp.value = y+'-'+String(m+1).padStart(2,'0'); sync(); close(); inp.dispatchEvent(new Event('input',{bubbles:true})); }
  function place(){ const r=trig.getBoundingClientRect(); pop.style.minWidth=Math.max(r.width,240)+'px'; pop.style.left=r.left+'px'; pop.style.visibility='hidden'; pop.classList.add('open'); document.body.appendChild(pop); const h=pop.offsetHeight; let top=r.bottom+6; if(top+h>window.innerHeight-8 && r.top-h-6>8) top=r.top-h-6; pop.style.top=top+'px'; pop.style.visibility='visible'; }
  function open(){ if(mOpen)mOpen(); const a = valid()? inp.value.split('-').map(Number):[selY, selM+1]; viewYear=a[0]; build(); place(); trig.classList.add('open'); mOpen=close; setTimeout(()=>{ document.addEventListener('click',onDoc,true); window.addEventListener('scroll',onScrollM,true); window.addEventListener('resize',close,true); },0); }
  function close(){ if(pop.parentNode)pop.parentNode.removeChild(pop); pop.classList.remove('open'); trig.classList.remove('open'); if(mOpen===close)mOpen=null; document.removeEventListener('click',onDoc,true); window.removeEventListener('scroll',onScrollM,true); window.removeEventListener('resize',close,true); }
  function onDoc(e){ if(!pop.contains(e.target)&&!trig.contains(e.target)) close(); }
  function onScrollM(e){ if(pop.contains(e.target)) return; close(); }
  trig.addEventListener('click',e=>{ e.stopPropagation(); trig.classList.contains('open')?close():open(); });
  inp._mSync=sync; sync();
}
function mSync(id){ const i=document.getElementById(id); if(i&&i._mSync) i._mSync(); }
function enhanceMonthsAll(){ ['billStart','allocStart'].forEach(id=>{ const i=document.getElementById(id); if(i) enhanceMonth(i); }); }
function csSyncAll(){ document.querySelectorAll('select').forEach(s=>{ if(s._csSync) s._csSync(); }); }
/* ---- Keyboard: confirm card + global ---- */
function ccVisibleFocusables(){ const card=document.getElementById('confirmCard'); return [...card.querySelectorAll('.cc-date-btn, .cc-btn, .cc-input')].filter(el=> el.offsetParent!==null); }
function ccKeydown(e){
  const card=document.getElementById('confirmCard'); if(!card.classList.contains('show')) return;
  if(e.key==='Escape'){ e.preventDefault(); cancelConfirm(); return; }
  if(e.key==='Enter' && document.activeElement && document.activeElement.classList.contains('cc-input')){ e.preventDefault(); confirmActualInput(); return; }
  if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(e.key)){
    const els=ccVisibleFocusables(); if(!els.length) return; e.preventDefault();
    let i=els.indexOf(document.activeElement); if(i<0) i=0;
    const dir=(e.key==='ArrowDown'||e.key==='ArrowRight')?1:-1;
    i=(i+dir+els.length)%els.length; els[i].focus(); if(els[i].select) try{ els[i].select(); }catch(_){}
  }
}
function globalKeys(e){
  if(e.key==='Escape'){
    const ov=[...document.querySelectorAll('.overlay.open')];
    if(ov.length){ closeOverlay(ov[ov.length-1].id); return; }
    const mp=document.getElementById('monthPop'); if(mp&&mp.classList.contains('open')&&typeof closeMonthPicker==='function'){ closeMonthPicker(); return; }
  }
  if(e.key==='Enter'){
    const a=document.activeElement;
    if(a && a.tagName==='INPUT' && a.type!=='date'){
      const ov=a.closest('.overlay.open');
      if(ov){ const save=ov.querySelector('.btn-primary'); if(save){ e.preventDefault(); save.click(); } }
    }
  }
}
function syncCurSyms() { const sym=(CURRENCIES[currencyTo()]||{symbol:''}).symbol; document.querySelectorAll('.cur-sym').forEach(e=>e.textContent=sym); }
function renderAll() {
  syncCurSyms(); csSyncAll();
  updateMonthDisplay(); renderSummary();
  renderIncomeBudget('ivbOverview', false); renderIncomeBudget('ivbBudget', true);
  renderWeekDigest(); renderMoMDeltas();
  renderBudget(); renderBreakdown();
  renderCalendar(); renderTransactions(); renderRecurring(); renderGoals(); renderBundles(); renderSettledBadge(); renderSavingsBalance(); renderGeneralSavings(); renderSalaryControl(); renderTrend(); renderDebts();
  applyDim();
}

const CURRENCIES = {
  BRL:{symbol:'R$',locale:'pt-BR'}, USD:{symbol:'$',locale:'en-US'}, EUR:{symbol:'€',locale:'en-IE'},
  GBP:{symbol:'£',locale:'en-GB'}, CAD:{symbol:'C$',locale:'en-CA'}, AUD:{symbol:'A$',locale:'en-AU'},
  JPY:{symbol:'¥',locale:'ja-JP'}, CHF:{symbol:'CHF',locale:'de-CH'}, MXN:{symbol:'MX$',locale:'es-MX'},
  ARS:{symbol:'$',locale:'es-AR'}, INR:{symbol:'₹',locale:'en-IN'}, ZAR:{symbol:'R',locale:'en-ZA'}, NZD:{symbol:'NZ$',locale:'en-NZ'}
};
function P() { return DATA && DATA.settings || {}; }
function mode() { return P().mode === 'salaried' ? 'salaried' : 'hourly'; }
function dailyHours() { const h = Number(P().daily_hours); return h > 0 ? h : 8; }
function overtimeMode() { const o = P().overtime_mode; return (o === 'automatic' || o === 'manual') ? o : 'off'; }
function overtimeMult() { const m = Number(P().overtime_mult); return m > 0 ? m : 1.5; }
function convertEnabled() { const v = P().convert_enabled; return v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true'; }
function profileIsSet() { const v = P().profile_set; return v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true'; }
function currencyFrom() { return P().currency_from || 'USD'; }
function currencyTo() { return P().currency_to || 'BRL'; }
function hourlyRate() { return Number(P().hourly_rate) || 0; }
function monthlySalary() { return Number(P().monthly_salary) || 0; }
function exchRate() { return convertEnabled() ? (Number(P().exchange_rate) || 1) : 1; }
function viewHidden() { const ym=curYM(); return isPast() ? !revealedMonths.has(ym) : hiddenMonths.has(ym); }
function brl(n) {
  const c = CURRENCIES[currencyTo()] || { symbol: '', locale: 'en-US' };
  if (viewHidden()) return (c.symbol ? c.symbol + ' ' : '') + '•••••';
  return (c.symbol ? c.symbol + ' ' : '') + Math.abs(n).toLocaleString(c.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function brlSig(n) { return (Number(n) < 0 ? '−' : '') + brl(n); }
function todayStr() { return dayStr(now.getFullYear(), now.getMonth(), now.getDate()); }
function daysInMonth(y,m) { return new Date(y, m+1, 0).getDate(); }
function ymLabel(ym) { const [y,m]=ym.split('-').map(Number); return new Date(y,m-1,1).toLocaleString(L(),{month:'short',year:'numeric'}); }
function isFuture() { return selY > now.getFullYear() || (selY === now.getFullYear() && selM > now.getMonth()); }
function isForecast() { return !isPast(); } // current month or later: include projected costs
function selectedTx() { return (DATA.transactions||[]).filter(t => { const d = new Date(t.date+'T12:00:00'); return d.getFullYear()===selY && d.getMonth()===selM; }); }

function billOverride(id, ymS) { const p = (DATA.payments||[]).find(p => p.month===ymS && (p.type==='bill'||p.type==='recurring'||p.type==='installment') && String(p.itemId)===String(id) && p.actualAmount!=null); return p ? p.actualAmount : null; }
function allocOverride(id, ymS) { const p = (DATA.payments||[]).find(p => p.month===ymS && p.type==='allocation' && String(p.itemId)===String(id) && p.actualAmount!=null); return p ? p.actualAmount : null; }
function allocationPaidSum(a) { return (DATA.payments||[]).filter(p=>p.type==='allocation' && String(p.itemId)===String(a.id) && paymentMarkedPaid(p)).reduce((s,p)=>s+(p.actualAmount!=null?p.actualAmount:a.amount),0); }
function billAmountFor(b, y, m) { const ov = billOverride(b.id, ymStr(y,m)); return ov!=null ? ov : b.amount; }
function billStarted(b, cur) { return FinMath.billStarted(b, cur); }
function activeBills() {
  const cur = ymStr(selY,selM);
  return (DATA.recurring||[]).map(b => {
    if (paymentPaidFor(['skip'], b.id, cur)) return null;
    let base;
    if (b.installments<=0) { if (!billStarted(b, cur)) return null; base = {...b, ongoing:true, num:0}; }
    else { const diff = monthDiff(b.startMonth, cur); if (diff<0 || diff>=b.installments) return null; base = {...b, ongoing:false, num:diff+1}; }
    const ov = billOverride(b.id, cur);
    base.nominal = b.amount;
    base.amount = ov!=null ? ov : b.amount;
    base.overridden = ov!=null;
    return base;
  }).filter(Boolean);
}
function activeAllocations() {
  const cur = ymStr(selY,selM);
  return (DATA.allocations||[]).map(a => {
    if (paymentPaidFor(['skip'], a.id, cur)) return null;
    const diff = monthDiff(a.startMonth, cur);
    if (diff<0) return null;
    if (a.installments>0 && diff>=a.installments) return null;
    const ov = allocOverride(a.id, cur);
    return {...a, ongoing:a.installments<=0, num:diff+1, nominal:a.amount, amount:ov!=null?ov:a.amount, overridden:ov!=null};
  }).filter(Boolean);
}
function activeAllocationsAt(y,m) {
  const cur = ymStr(y,m);
  return (DATA.allocations||[]).map(a => {
    if (paymentPaidFor(['skip'], a.id, cur)) return null;
    const diff = monthDiff(a.startMonth, cur); if (diff<0) return null; if (a.installments>0 && diff>=a.installments) return null;
    const ov = allocOverride(a.id, cur);
    return {...a, ongoing:a.installments<=0, num:diff+1, nominal:a.amount, amount:ov!=null?ov:a.amount, overridden:ov!=null};
  }).filter(Boolean);
}
function paymentMarkedPaid(p) { return !!(p && (p.paid === true || p.type === 'skip')); }
function paymentPaidFor(types, id, ymS) { return (DATA.payments||[]).some(p => p.month===ymS && types.indexOf(p.type)>-1 && String(p.itemId)===String(id) && paymentMarkedPaid(p)); }
function paymentActualFor(types, id, ymS) { const p = (DATA.payments||[]).find(x => x.month===ymS && types.indexOf(x.type)>-1 && String(x.itemId)===String(id) && x.actualAmount!=null); return p ? p.actualAmount : null; }
function paidDateOf(p) { const pd = p.paidDate; return (pd && /^\d{4}-\d{2}-\d{2}$/.test(pd)) ? pd : (p.month + '-01'); }
function billPaidType(raw) { return (Number(raw) < 0) ? 'Income' : 'Expense'; }
function billPaidAmount(raw) { const n = Number(raw) || 0; return n < 0 ? Math.abs(n) : n; }
function expenseFlow(entry) { return entry && entry.type === 'Income' ? -entry.amount : (entry ? entry.amount : 0); }
// Virtual paid bill/allocation entries land in the month money actually moved (paidDate).
function paidEntries(y,m) {
  const ymS = ymStr(y,m), out = [], seen = {};
  (DATA.payments||[]).forEach(p => {
    if (!paymentMarkedPaid(p)) return;
    const fam = (p.type==='recurring'||p.type==='installment') ? 'bill' : p.type;
    if (fam!=='bill' && fam!=='allocation') return; // pending transactions are counted via the transaction itself
    const key = fam+':'+p.itemId+':'+p.month;
    if (seen[key]) return; seen[key] = 1;
    if (paidDateOf(p).slice(0,7) !== ymS) return;
    if (fam==='allocation') {
      const a = (DATA.allocations||[]).find(x=>String(x.id)===String(p.itemId));
      out.push({ virtual:true, src:'allocation', id:p.itemId, category:t('cat.savings'), description:t('digest.savingsTo',{goal:goalName(a?a.goalId:null)}), amount: p.actualAmount!=null?p.actualAmount:(a?a.amount:0), date: paidDateOf(p), type:'Expense' });
    } else {
      const b = (DATA.recurring||[]).find(x=>String(x.id)===String(p.itemId)); if (!b) return;
      const rawAmt = p.actualAmount!=null ? p.actualAmount : b.amount;
      out.push({ virtual:true, src:'bill', id:p.itemId, category:b.category, description:b.name, amount: billPaidAmount(rawAmt), date: paidDateOf(p), type: billPaidType(rawAmt) });
    }
  });
  return out;
}
function paidExpenseOnly(y,m) { return paidEntries(y,m).filter(e=>e.type==='Expense').reduce((s,e)=>s+e.amount,0); }
function paidIncomeCredit(y,m) { return paidEntries(y,m).filter(e=>e.type==='Income').reduce((s,e)=>s+e.amount,0); }
function paidExtra(y,m) { return paidExpenseOnly(y,m) - paidIncomeCredit(y,m); }
function unpaidExtra() {
  let t = 0;
  activeBills().forEach(b => { if (!isPaidBill(b.id)) t += b.amount; });
  activeAllocations().forEach(a => { if (!isPaid('allocation', a.id)) t += a.amount; });
  return t;
}

function setDefaultDate() { JB.dpSet('txDate', isFuture() ? ymStr(selY,selM)+'-01' : todayStr()); }
function navigate(d) { selM += d; if (selM > 11) { selM = 0; selY++; } if (selM < 0) { selM = 11; selY--; } editingHoursDate=null; setDefaultDate(); renderAll(); }
function updateMonthDisplay() {
  document.getElementById('monthDisplay').textContent = new Date(selY, selM, 1).toLocaleString(L(), {month:'long', year:'numeric'});
  const f = isForecast();
  const _badge = document.getElementById('projBadge');
  if (isPast()) { _badge.className='month-badge past'; _badge.textContent=t('badge.past'); }
  else if (isCurrentMonth()) {
    if (allSettled()) { _badge.className='month-badge allset'; _badge.textContent=t('badge.allSet'); }
    else { _badge.className='month-badge current'; _badge.textContent=t('badge.current'); }
  } else { _badge.className='month-badge projected'; _badge.textContent=t('badge.projected'); }
  document.getElementById('lblIncome').textContent  = f ? t('sum.loggedIncome') : t('sum.income');
  document.getElementById('lblExpense').textContent = f ? t('sum.projectedCosts') : t('sum.expenses');
  document.getElementById('lblBalance').textContent = f ? t('sum.expectedBalance') : t('sum.balance');
  document.getElementById('todayBtn').style.visibility = isCurrentMonth() ? 'hidden' : 'visible';
}

/* ---------- Month navigation ---------- */
function isCurrentMonth() { return selY===now.getFullYear() && selM===now.getMonth(); }
function isPast() { return selY < now.getFullYear() || (selY===now.getFullYear() && selM < now.getMonth()); }
function curYM() { return ymStr(selY, selM); }
function toggleMonthPicker() { const p=document.getElementById('monthPop'); if (p.classList.toggle('open')) { pickYear=selY; renderMonthPicker(); } }
function closeMonthPicker() { const p=document.getElementById('monthPop'); if (p) p.classList.remove('open'); }
function renderMonthPicker() {
  document.getElementById('mpYear').textContent = pickYear;
  const MN=mnNames();
  document.getElementById('mpGrid').innerHTML = MN.map((m,i)=>{
    const sel=(pickYear===selY && i===selM), cur=(pickYear===now.getFullYear() && i===now.getMonth());
    return '<button class="mp-month'+(sel?' sel':'')+(cur?' cur':'')+'" onclick="pickMonth('+i+')">'+m+'</button>';
  }).join('');
}
function pickYearNav(d) { pickYear+=d; renderMonthPicker(); }
function pickMonth(i) { selY=pickYear; selM=i; editingHoursDate=null; setDefaultDate(); closeMonthPicker(); renderAll(); }
function goToday() { selY=now.getFullYear(); selM=now.getMonth(); editingHoursDate=null; setDefaultDate(); closeMonthPicker(); renderAll(); }
function applyDim() {
  const app=document.getElementById('app'), hidden=viewHidden();
  app.classList.toggle('past-dim', isPast() && hidden);
  const eye=document.getElementById('eyeBtn');
  if (eye) { eye.style.display='flex'; eye.textContent = hidden ? '🙈' : '👁'; eye.title = hidden ? t('eye.show') : t('eye.hide'); eye.classList.toggle('active', hidden); }
}
function jbLoadSet(k){ try{ return new Set(JSON.parse(localStorage.getItem(k)||'[]')); }catch(_){ return new Set(); } }
function saveReveal(){ try{ localStorage.setItem('jb_fin_reveal', JSON.stringify([...revealedMonths])); localStorage.setItem('jb_fin_hide', JSON.stringify([...hiddenMonths])); }catch(_){} }
function toggleReveal() {
  const ym=curYM();
  if (isPast()) { revealedMonths.has(ym) ? revealedMonths.delete(ym) : revealedMonths.add(ym); }
  else { hiddenMonths.has(ym) ? hiddenMonths.delete(ym) : hiddenMonths.add(ym); }
  saveReveal();
  renderAll();
}

function txIsProjected(t) { return false; } /* pending transactions removed — every transaction is an actual */

function renderSummary() {
  const txs = selectedTx();
  const income = incomeFor(selY,selM);
  const loggedExp = txs.filter(t=>t.type==='Expense').reduce((s,t)=>s+t.amount,0);
  const expenses = loggedExp + paidExpenseOnly(selY,selM) + (isForecast() ? unpaidExtra() : 0);
  const bal = income - expenses;
  const rate = income > 0 ? Math.round((bal/income)*100) : 0;
  document.getElementById('vIncome').textContent  = brl(income);
  document.getElementById('vExpense').textContent = brl(expenses);
  document.getElementById('vBalance').textContent = (bal < 0 ? '−' : '') + brl(bal);
  document.getElementById('vSavings').textContent = rate + '%';
  document.getElementById('sIncome').textContent  = t('sum.txCount',{n:txs.filter(t=>t.type==='Income').length});
  document.getElementById('sExpense').textContent = isForecast() ? t('sum.inclBills') : t('sum.txCount',{n:txs.filter(t=>t.type==='Expense').length});
}

/* ---------- Budget intelligence ---------- */
function txInMonth(t,y,m) { const d=new Date(t.date+'T12:00:00'); return d.getFullYear()===y && d.getMonth()===m; }
function spendInMonth(cat,y,m) { return (DATA.transactions||[]).filter(t=>t.type==='Expense'&&t.category===cat&&txInMonth(t,y,m)).reduce((s,t)=>s+t.amount,0); }
function billActiveIn(b,y,m) { if (paymentPaidFor(['skip'], b.id, ymStr(y,m))) return false; if (b.installments<=0) return true; const diff=monthDiff(b.startMonth, ymStr(y,m)); return diff>=0 && diff<b.installments; }
function billsInMonth(cat,y,m) { return (DATA.recurring||[]).filter(b=>b.category===cat && billActiveIn(b,y,m)).reduce((s,b)=>s+billAmountFor(b,y,m),0); }
function budgetSpend(cat,y,m) { return spendInMonth(cat,y,m) + billsInMonth(cat,y,m); }
function monthHasData(y,m) { return (DATA.transactions||[]).some(t=>txInMonth(t,y,m)) || (DATA.recurring||[]).some(b=>billActiveIn(b,y,m)); }

function budgetAnchor() { return isFuture() ? [now.getFullYear(), now.getMonth()] : [selY, selM]; }
function prevYM(k) { const [ay,am]=budgetAnchor(); const d=new Date(ay, am-k, 1); return [d.getFullYear(), d.getMonth()]; }
function categoryHistory(cat,count) { const a=[]; for(let k=count;k>=1;k--){ const [y,m]=prevYM(k); a.push({y,m,amount:budgetSpend(cat,y,m),has:monthHasData(y,m)}); } return a; }
function roundBudget(x) { if (x>=500) return Math.round(x/50)*50; if (x>=100) return Math.round(x/10)*10; return Math.max(5, Math.round(x/5)*5); }

function budgetTrend(cat, budget) {
  const hist = categoryHistory(cat, 3), withData = hist.filter(h=>h.has);
  if (!withData.length) return null;
  const avg = withData.reduce((s,h)=>s+h.amount,0)/withData.length;
  let streak = 0;
  for (let i=hist.length-1; i>=0; i--) { if (hist[i].has && hist[i].amount>budget && budget>0) streak++; else break; }
  if (streak>=3) return { label:t('trend.over',{n:streak}), cls:'warn' };
  if (budget>0 && avg>budget*1.1) return { label:t('trend.trendingOver',{avg:brl(avg)}), cls:'warn' };
  if (budget>0 && avg<budget*0.6) return { label:t('trend.room',{avg:brl(avg)}), cls:'good' };
  return { label:t('trend.onTrack',{avg:brl(avg)}), cls:'' };
}
function sparkBars(cat, budget) {
  const vals = [];
  for (let k=3;k>=1;k--){ const [y,m]=prevYM(k); vals.push(budgetSpend(cat,y,m)); }
  vals.push(budgetSpend(cat,selY,selM));
  const max = Math.max(budget, ...vals, 1);
  const bars = vals.map((v,i)=>{ const h=Math.max(3,Math.round(v/max*100)), over=budget>0&&v>budget, cur=i===vals.length-1;
    return '<span class="spark-bar'+(over?' over':'')+(cur?' cur':'')+'" style="height:'+h+'%" title="'+brl(v)+'"></span>'; }).join('');
  const line = budget>0 ? '<span class="spark-line" style="bottom:'+Math.round(budget/max*100)+'%"></span>' : '';
  return '<div class="spark">'+bars+line+'</div>';
}
function suggestions() {
  const budgeted = new Set((DATA.budget||[]).map(b=>b.category));
  const win = [prevYM(1), prevYM(2), prevYM(3)];
  const expMonths = win.filter(([y,m]) => (DATA.transactions||[]).some(t=>txInMonth(t,y,m))).length || 1;
  const cats = new Set();
  (DATA.transactions||[]).filter(t=>t.type==='Expense').forEach(t=>{ const d=new Date(t.date+'T12:00:00'); if (win.some(w=>w[0]===d.getFullYear()&&w[1]===d.getMonth())) cats.add(t.category); });
  (DATA.recurring||[]).forEach(b=>{ if (billActiveIn(b, selY, selM)) cats.add(b.category); });
  const out = [];
  cats.forEach(c => {
    if (budgeted.has(c) || !knownCat(c)) return;
    const expenseAvg = win.reduce((s,[y,m])=>s+spendInMonth(c,y,m),0) / expMonths;
    const billNow = billsInMonth(c, selY, selM);
    const total = expenseAvg + billNow;
    const ordered = [prevYM(3),prevYM(2),prevYM(1)].map(([y,m])=>budgetSpend(c,y,m));
    let arrow='→';
    const last=ordered[ordered.length-1], prior=ordered.slice(0,-1).reduce((s,v)=>s+v,0)/(ordered.length-1);
    if (prior>0) { if (last>prior*1.15) arrow='↑'; else if (last<prior*0.85) arrow='↓'; }
    if (roundBudget(total)>0) out.push({ category:c, avg:total, arrow, suggested:roundBudget(total) });
  });
  return out.sort((a,b)=>b.avg-a.avg);
}
function applySuggestion(i) {
  const s = SUGG[i]; if (!s) return;
  jbRun('addRecord', 'budget', {category:s.category, budget:s.suggested}).then(()=>{ showToast(t('toast.budgetSet')); reload(); }).catch(e=>showToast(t('err.prefix')+e.message,'error'));
}
function renderBudget() {
  const el = document.getElementById('budgetList'), budgets = DATA.budget||[];
  let html = '';
  if (budgets.length) {
    html += budgets.map(b => {
      const spent = budgetSpend(b.category, selY, selM), pct = b.budget>0?Math.min(spent/b.budget*100,100):0, over = spent>b.budget;
      const tr = budgetTrend(b.category, b.budget);
      const trendHtml = tr ? '<div class="budget-trend">'+sparkBars(b.category,b.budget)+'<span class="trend-label '+tr.cls+'">'+tr.label+'</span></div>' : '';
      return '<div class="budget-item click" onclick="editBudget(\''+b.id+'\')"><div class="budget-row"><span class="budget-name">'+esc(b.category)+'</span><span class="budget-nums"><span class="spent '+(over?'over':'')+'">'+brl(spent)+'</span><span style="color:var(--muted)"> / '+brl(b.budget)+'</span></span></div><div class="track"><div class="fill" style="width:'+pct+'%;background:'+(over?'var(--expense)':catColor(b.category))+'"></div></div>'+trendHtml+'</div>';
    }).join('');
  }
  SUGG = suggestions();
  if (SUGG.length) {
    html += '<div class="suggest-block"><div class="suggest-title">💡 '+(budgets.length?t('suggest.more'):t('suggest.suggested'))+'</div>'
      + SUGG.map((s,i)=>'<div class="suggest-row"><div class="suggest-info"><span class="suggest-cat">'+esc(s.category)+'</span> <span class="trend-arrow">'+s.arrow+'</span><div class="suggest-avg">'+t('suggest.perMo',{avg:brl(s.avg)})+'</div></div><button class="suggest-btn" onclick="applySuggestion('+i+')">'+t('suggest.set',{amt:brl(s.suggested)})+'</button></div>').join('')
      + '</div>';
  }
  if (!html) {
    const win = [prevYM(1), prevYM(2), prevYM(3)];
    const hasAny = win.some(([y,m]) => monthHasData(y,m));
    html = hasAny
      ? '<div class="empty">'+t('empty.noBudgetSuggest')+'</div>'
      : '<div class="empty">'+t('empty.noHistory')+'</div>';
  }
  el.innerHTML = html;
}

// Per-category split: spent (logged txns + paid bills/allocs) vs still-to-come (unpaid commitments).
function spentVsProjectedByCat() {
  const spent = {}, proj = {};
  selectedTx().filter(t=>t.type==='Expense' && !txIsProjected(t)).forEach(t => { const k=catLabel(t.category); spent[k]=(spent[k]||0)+t.amount; });
  paidEntries(selY,selM).forEach(e => { const k=catLabel(e.category); spent[k]=(spent[k]||0)+expenseFlow(e); });
  if (isForecast()) {
    activeBills().forEach(b => { if (!isPaidBill(b.id)) { const k=catLabel(b.category); proj[k]=(proj[k]||0)+b.amount; } });
    activeAllocations().forEach(al => { if (!isPaid('allocation', al.id)) { const sk=t('cat.savings'); proj[sk]=(proj[sk]||0)+al.amount; } });
    selectedTx().filter(txIsProjected).forEach(t => { const k=catLabel(t.category); proj[k]=(proj[k]||0)+t.amount; });
  }
  const out = {};
  Object.keys(spent).forEach(k => out[k]={spent:spent[k], proj:0});
  Object.keys(proj).forEach(k => { out[k]=out[k]||{spent:0,proj:0}; out[k].proj=proj[k]; });
  return out;
}
function renderBreakdown() {
  const el = document.getElementById('breakdown'); if (!el) return;
  const data = spentVsProjectedByCat();
  const cats = Object.keys(data).map(k=>({cat:k, spent:data[k].spent, proj:data[k].proj, total:data[k].spent+data[k].proj}))
    .filter(c=>c.total>0.005).sort((a,b)=>b.total-a.total);
  if (!cats.length) { el.innerHTML = '<div class="empty">'+t('empty.noSpending')+'</div>'; return; }
  const max = Math.max.apply(null, cats.map(c=>c.total));
  const totSpent = cats.reduce((s,c)=>s+c.spent,0), totProj = cats.reduce((s,c)=>s+c.proj,0);
  let head = '<div class="bd-legend"><span class="bd-key"><span class="bd-swatch"></span>'+t('bd.spent',{x:brl(totSpent)})+'</span>';
  if (totProj>0.005) head += '<span class="bd-key"><span class="bd-swatch faded"></span>'+t('bd.toCome',{x:brl(totProj)})+'</span>';
  head += '</div>';
  const rows = cats.map(c => {
    const w = max>0 ? c.total/max*100 : 0, sp = c.total>0 ? c.spent/c.total*100 : 0, pr = 100-sp, col = catColor(c.cat);
    const sub = c.proj>0.005 ? t('bd.subBoth',{spent:brl(c.spent),proj:brl(c.proj)}) : t('bd.subSpent',{spent:brl(c.spent)});
    return '<div class="bd-item"><div class="bd-rowtop"><span class="bd-name">'+esc(c.cat)+'</span><span class="bd-total">'+brl(c.total)+'</span></div>'
      + '<div class="bd-track"><div class="bd-bar" style="width:'+w+'%">'
      + (c.spent>0?'<div class="bd-seg" style="width:'+sp+'%;background:'+col+'"></div>':'')
      + (c.proj>0.005?'<div class="bd-seg faded" style="width:'+pr+'%;background:'+col+'"></div>':'')
      + '</div></div><div class="bd-sub">'+sub+'</div></div>';
  }).join('');
  el.innerHTML = head + '<div class="bd-list">'+rows+'</div>';
}

/* ---------- Work-log calendar ---------- */
function offWeekdays() { return (DATA.settings && DATA.settings.off_weekdays) || []; }
function workLogMap() { const m={}; (DATA.workLog||[]).forEach(w=>m[w.date]=w); return m; }
function isWorkingWeekday(ds) { return offWeekdays().indexOf(new Date(ds+'T12:00:00').getDay()) === -1; }
function expectedDayHours(ds) { return isWorkingWeekday(ds) ? dailyHours() : 0; }
function dayDefault(ds) { const worked = isWorkingWeekday(ds); return { worked, hours: worked?dailyHours():0, ot:0 }; }
function dayState(ds) { const ov = workLogMap()[ds]; if (ov) return { worked: ov.worked, hours: ov.worked?Number(ov.hours):0, ot: ov.worked?(Number(ov.otHours)||0):0 }; return dayDefault(ds); }
function isDefaultDay(ds, worked, hours, ot) { const d = dayDefault(ds); if (!worked) return d.worked === false; return d.worked === true && Number(hours) === dailyHours() && (Number(ot)||0) === 0; }
function calStats() {
  const dim = daysInMonth(selY, selM), dh = dailyHours();
  let days=0, hours=0, ot=0, expDays=0;
  for (let d=1; d<=dim; d++) {
    const ds = dayStr(selY,selM,d);
    if (isWorkingWeekday(ds)) expDays++;
    const st = dayState(ds);
    if (st.worked) { days++; hours += Number(st.hours)||0; ot += Number(st.ot)||0; }
  }
  return { days, hours, ot, expDays, expHours: expDays*dh };
}
function fmtHours(h) { return (Math.round(h*100)/100) + 'h'; }

// Unified pay engine — returns amounts already converted to the tracking currency.
function computeIncome() {
  const s = calStats(), exp = s.expHours, act = s.hours, otTag = s.ot, m = mode(), om = overtimeMode(), mult = overtimeMult();
  const baseHourly = m === 'salaried' ? (exp > 0 ? monthlySalary()/exp : 0) : hourlyRate();
  let basePay = 0, otPay = 0;
  if (om === 'manual') {
    const normalH = Math.max(act - otTag, 0);
    basePay = m === 'salaried' ? Math.min(normalH, exp)*baseHourly : normalH*baseHourly;
    otPay = otTag * baseHourly * mult;
  } else if (om === 'automatic') {
    basePay = Math.min(act, exp) * baseHourly;
    otPay = Math.max(act - exp, 0) * baseHourly * mult;
  } else {
    basePay = m === 'salaried' ? Math.min(act, exp)*baseHourly : act*baseHourly;
  }
  const ex = exchRate();
  return { expHours:exp, actHours:act, otTag, baseHourly, basePay:basePay*ex, otPay:otPay*ex, total:(basePay+otPay)*ex };
}

function renderCalendar() {
  const off = offWeekdays();
  document.getElementById('weekdayToggles').innerHTML = wdNames().map((w,i)=>'<button class="wd-toggle'+(off.indexOf(i)>-1?' off':'')+'" onclick="toggleWeekday('+i+')">'+w+'</button>').join('');
  document.getElementById('calGridHead').innerHTML = wdNames().map(w=>'<div class="cal-dow">'+w+'</div>').join('');
  const dim = daysInMonth(selY, selM), firstDow = new Date(selY, selM, 1).getDay(), tdy = todayStr();
  let cells = '';
  for (let i=0; i<firstDow; i++) cells += '<div></div>';
  for (let d=1; d<=dim; d++) {
    const ds = dayStr(selY,selM,d), st = dayState(ds), isTdy = ds===tdy;
    let inner = '<span class="cal-daynum">'+d+(st.ot>0?' <span class="ot-tag">OT</span>':'')+'</span>';
    if (st.worked) {
      if (editingHoursDate===ds) inner += '<input id="hoursInput" class="cal-hours-input" type="number" step="0.5" min="0" value="'+st.hours+'" onclick="event.stopPropagation()" onblur="commitHours(\''+ds+'\',this.value)" onkeydown="if(event.key===\'Enter\'){this.blur();}else if(event.key===\'Escape\'){cancelHours();}">';
      else inner += '<span class="cal-hours" onclick="event.stopPropagation();editDayHours(\''+ds+'\')">'+fmtHours(st.hours)+'</span>';
    }
    cells += '<div class="cal-day '+(st.worked?'worked':'off')+(isTdy?' today':'')+'" onclick="toggleDay(\''+ds+'\')">'+inner+'</div>';
  }
  document.getElementById('calGrid').innerHTML = cells;
  renderCalcInputs(); renderCalSummary(); updateResult();
}
function renderCalcInputs() {
  const from = currencyFrom(), to = currencyTo(), conv = convertEnabled();
  let html = '';
  if (mode()==='salaried') html += '<span>'+from+'/mo</span><input type="number" class="calc-input-sm" id="cSalary" step="0.01" value="'+monthlySalary()+'" oninput="footerEdit()">';
  else html += '<span>'+from+'/h</span><input type="number" class="calc-input-sm" id="cRate" step="0.01" value="'+hourlyRate()+'" oninput="footerEdit()">';
  if (conv) html += '<span>× '+to+'/'+from+'</span><input type="number" class="calc-input-sm" id="cExch" step="0.01" value="'+(Number(P().exchange_rate)||0)+'" oninput="footerEdit()">';
  document.getElementById('calcInputs').innerHTML = html;
}
function footerEdit() {
  const r=document.getElementById('cRate'), sal=document.getElementById('cSalary'), ex=document.getElementById('cExch');
  if (r) DATA.settings.hourly_rate = parseFloat(r.value)||0;
  if (sal) DATA.settings.monthly_salary = parseFloat(sal.value)||0;
  if (ex) DATA.settings.exchange_rate = parseFloat(ex.value)||0;
  renderCalSummary(); updateResult();
  clearTimeout(footerEdit._t);
  footerEdit._t = setTimeout(()=>{ jbSaveProfile({ hourly_rate:DATA.settings.hourly_rate, monthly_salary:DATA.settings.monthly_salary, exchange_rate:DATA.settings.exchange_rate }); }, 700);
}
function renderCalSummary() {
  const s = calStats();
  let txt = t('cal.summary',{days:s.days,hours:fmtHours(s.hours)});
  if (mode()==='salaried' || overtimeMode()!=='off') txt += t('cal.expected',{hours:fmtHours(s.expHours)});
  if (s.ot>0) txt += t('cal.ot',{hours:fmtHours(s.ot)});
  document.getElementById('calSummary').innerHTML = txt;
}
function updateResult() {
  const inc = computeIncome();
  document.getElementById('cResult').textContent = brl(inc.total);
  const bd = document.getElementById('calcBreakdown');
  if (bd) bd.textContent = inc.otPay>0 ? t('cal.baseOt',{base:brl(inc.basePay),ot:brl(inc.otPay)}) : '';
}
function commitDay(ds, worked, hours, ot) {
  worklogDirty=true;
  worked = !!worked; hours = worked ? Math.max(Number(hours)||0, 0) : 0;
  if (worked && hours === 0) worked = false;
  ot = worked ? Math.max(Number(ot)||0, 0) : 0;
  DATA.workLog = (DATA.workLog||[]).filter(w => w.date !== ds);
  const def = isDefaultDay(ds, worked, hours, ot);
  if (!def) DATA.workLog.push({ date: ds, worked, hours, otHours: ot });
  renderCalendar();
  const fail = e => { showToast(t('err.prefix')+e.message,'error'); reload(); };
  (def ? jbRun('clearWorkDay', ds) : jbRun('setWorkDay', ds, worked, hours, ot)).catch(fail);
}
function toggleDay(ds) { const s = dayState(ds); commitDay(ds, !s.worked, !s.worked ? dailyHours() : 0, 0); }
function editDayHours(ds) { editingHoursDate = ds; renderCalendar(); setTimeout(()=>{ const inp = document.getElementById('hoursInput'); if (inp) { inp.focus(); inp.select(); } }, 30); }
function commitHours(ds, val) {
  editingHoursDate = null;
  const h = parseFloat(val); if (isNaN(h)) { renderCalendar(); return; }
  const worked = h>0, hours = Math.max(h,0), prev = dayState(ds);
  const ot = worked ? Math.min(Number(prev.ot)||0, Math.max(0, hours - expectedDayHours(ds))) : 0;
  commitDay(ds, worked, hours, ot);
  if (worked && overtimeMode()==='manual') maybePromptOT(ds, hours);
}
function cancelHours() { editingHoursDate = null; renderCalendar(); }
function maybePromptOT(ds, hours) {
  const excess = Math.round((hours - expectedDayHours(ds))*100)/100;
  if (excess <= 0) return;
  confirmCtx = { kind:'ot', date:ds, excess:excess };
  document.getElementById('ccTitle').textContent = '⏱ ' + new Date(ds+'T12:00:00').toLocaleDateString(L(),{day:'numeric',month:'short'});
  document.getElementById('ccQ').innerHTML = t('ot.promptQ',{h:fmtHours(excess)});
  document.getElementById('ccInput').value = excess;
  document.getElementById('ccInput').placeholder = t('ph.hours');
  document.getElementById('ccYesNo').style.display = 'flex';
  document.getElementById('ccInputWrap').style.display = 'none';
  document.getElementById('confirmCard').classList.add('show');
}
function toggleWeekday(i) {
  worklogDirty=true;
  let off = offWeekdays().slice(); const idx = off.indexOf(i);
  if (idx>-1) off.splice(idx,1); else off.push(i);
  off.sort((a,b)=>a-b);
  DATA.settings.off_weekdays = off; renderCalendar();
  jbRun('saveSetting', 'off_weekdays', off.map(d=>'d'+d).join(',')).catch(e => { showToast(t('err.prefix')+e.message,'error'); reload(); });
}
function logIncome() {
  const inc = computeIncome();
  if (!inc.total) { showToast(t('toast.noIncome'),'error'); return; }
  const btn = document.getElementById('logBtn'); btn.disabled = true;
  const worked = new Date(selY, selM, 1).toLocaleString(L(),{month:'long'});
  const pay = new Date(selY, selM + 1, 1);
  const payYM = ymStr(pay.getFullYear(), pay.getMonth());
  const date = payYM + '-01';
  const payName = pay.toLocaleString(L(),{month:'long', year:'numeric'});
  jbRun('logMonthlySalary', payYM, { date, description:t('tx.salaryDesc',{month:worked,year:selY}), category:t('cat.salary'), amount:inc.total, type:'Income' })
    .then(() => { btn.disabled=false; worklogDirty=false; showToast(t('toast.loggedTo',{month:payName,amt:brl(inc.total)})); reload(); })
    .catch(e => { btn.disabled=false; showToast(t('err.prefix')+e.message,'error'); });
}

/* ---------- Paid state ---------- */
function isPaidAny(types, id) { const m = ymStr(selY,selM); return (DATA.payments||[]).some(p => p.month===m && types.indexOf(p.type)>-1 && String(p.itemId)===String(id) && paymentMarkedPaid(p)); }
function isPaid(type, id) { return isPaidAny([type], id); }
function isPaidBill(id) { return isPaidAny(['bill','recurring','installment'], id); }
function applyPaid(type, id, nw, m, actualAmount, paidDate) {
  const fam = type==='bill' ? ['bill','recurring','installment'] : [type];
  DATA.payments = (DATA.payments||[]).filter(p => !(p.month===m && fam.indexOf(p.type)>-1 && String(p.itemId)===String(id)));
  if (nw) DATA.payments.push({ month:m, type:type, itemId:String(id), paid:true, actualAmount: (actualAmount===undefined||actualAmount===''||actualAmount===null)?null:Number(actualAmount), paidDate: paidDate||'' });
  jbRun('setPaid', m, type, id, nw, (actualAmount===undefined?'':actualAmount), paidDate||'').catch(e => { reload(); });
  if (type==='bill' && !nw) { jbRun('setPaid', m,'recurring',id,false,'','').catch(()=>{}); jbRun('setPaid', m,'installment',id,false,'','').catch(()=>{}); }
}
function togglePaid(type, id) {
  const m = ymStr(selY,selM), cur = type==='bill' ? isPaidBill(id) : isPaid(type,id), nw = !cur;
  if (type==='bill' && nw) { promptActual(id, m); return; }
  if (type==='allocation' && nw) {
    const a = activeAllocations().find(x=>x.id===id);
    const pd = isCurrentMonth() ? todayStr() : (m+'-01');
    applyPaid(type, id, true, m, a && a.overridden ? a.amount : null, pd);
    renderAll();
    return;
  }
  applyPaid(type, id, nw, m);
  renderAll();
}
function promptActual(id, m) {
  const b = (DATA.recurring||[]).find(x=>x.id===id);
  const dim = daysInMonth(selY,selM), occDate = dayStr(selY,selM, Math.min((b&&b.dueDay)||1, dim)), overdue = isPast();
  if (!b) { applyPaid('bill', id, true, m, '', overdue?todayStr():occDate); renderAll(); return; }
  confirmCtx = { kind:'paid', id:id, month:m, overdue:overdue, occDate:occDate, paidDate: overdue?todayStr():occDate };
  document.getElementById('ccTitle').textContent = '✓ ' + b.name;
  document.getElementById('ccQ').innerHTML = t('cc.wasAmount',{amt:brl(b.amount)});
  document.getElementById('ccInput').value = b.amount;
  document.getElementById('ccInput').placeholder = t('ph.actualAmount');
  const dr = document.getElementById('ccDateRow');
  if (overdue) {
    dr.style.display = 'flex';
    document.getElementById('ccDateBack').textContent = t('cc.backInMonth',{month:new Date(selY,selM,1).toLocaleString(L(),{month:'short'})});
    setCcDate('today');
  } else dr.style.display = 'none';
  document.getElementById('ccYesNo').style.display = 'flex';
  document.getElementById('ccInputWrap').style.display = 'none';
  document.getElementById('confirmCard').classList.add('show');
  setTimeout(()=>{ const y=document.querySelector('#ccYesNo .yes'); if(y) y.focus(); }, 20);
}
function setCcDate(which) {
  if (!confirmCtx) return;
  confirmCtx.paidDate = which==='back' ? confirmCtx.occDate : todayStr();
  document.getElementById('ccDateToday').className = 'cc-date-btn'+(which==='today'?' on':'');
  document.getElementById('ccDateBack').className = 'cc-date-btn'+(which==='back'?' on':'');
}
function cancelConfirm() { document.getElementById('confirmCard').classList.remove('show'); confirmCtx = null; }
function showActualInput() { document.getElementById('ccYesNo').style.display='none'; document.getElementById('ccInputWrap').style.display='flex'; const i=document.getElementById('ccInput'); i.focus(); i.select(); }
function commitOT(ds, ot) { const st = dayState(ds); commitDay(ds, st.worked, st.hours, Math.max(Number(ot)||0, 0)); }
function confirmActual() {
  if (!confirmCtx) return;
  if (confirmCtx.kind==='ot') { const ex=confirmCtx.excess, ds=confirmCtx.date; cancelConfirm(); commitOT(ds, ex); showToast(t('toast.otLogged',{h:fmtHours(ex)})); return; }
  applyPaid('bill', confirmCtx.id, true, confirmCtx.month, undefined, confirmCtx.paidDate);
  cancelConfirm(); renderAll(); showToast(t('toast.markedPaid'));
}
function confirmActualInput() {
  if (!confirmCtx) return;
  const v = parseFloat(document.getElementById('ccInput').value);
  if (isNaN(v) || (confirmCtx.kind==='ot' ? v < 0 : v === 0)) { showToast(confirmCtx.kind==='ot'?t('err.validHours'):t('err.validAmount'),'error'); return; }
  if (confirmCtx.kind==='ot') { const ds=confirmCtx.date; cancelConfirm(); commitOT(ds, v); showToast(t('toast.otLogged',{h:fmtHours(v)})); return; }
  if (confirmCtx.kind==='allocAmt') {
    applyAllocOverride(confirmCtx.id, confirmCtx.month, v);
    cancelConfirm(); renderAll(); showToast(t('toast.allocAmtMonth')); return;
  }
  applyPaid('bill', confirmCtx.id, true, confirmCtx.month, v, confirmCtx.paidDate);
  cancelConfirm(); renderAll(); showToast(t('toast.paidActual',{amt:brl(v)}));
}

/* ---------- Transactions ---------- */
let txSort='date_desc', billSort='due';
function sortTx(items){
  const by={
    date_desc:(a,b)=> a.date<b.date?1:(a.date>b.date?-1:0),
    date_asc:(a,b)=> a.date<b.date?-1:(a.date>b.date?1:0),
    amt_desc:(a,b)=> b.amount-a.amount,
    amt_asc:(a,b)=> a.amount-b.amount,
    name:(a,b)=> String(a.description||'').localeCompare(String(b.description||''),undefined,{sensitivity:'base'}),
  };
  return items.sort(by[txSort]||by.date_desc);
}
function sortBills(bills){
  const fut=isFuture(), td=now.getDate(), dim=daysInMonth(now.getFullYear(),now.getMonth());
  const daysUntil=dd=>(dd>=td?dd-td:dim-td+dd);
  const ord=id=>{const i=(DATA.recurring||[]).findIndex(x=>x.id===id);return i<0?9999:i;};
  const by={
    due:(a,b)=> fut? a.dueDay-b.dueDay : daysUntil(a.dueDay)-daysUntil(b.dueDay),
    name:(a,b)=> String(a.name||'').localeCompare(String(b.name||''),undefined,{sensitivity:'base'}),
    amt_desc:(a,b)=> b.amount-a.amount,
    amt_asc:(a,b)=> a.amount-b.amount,
    created:(a,b)=> ord(a.id)-ord(b.id),
  };
  return [...bills].sort(by[billSort]||by.due);
}
function setTxSort(v){ txSort=v; renderTransactions(); }
function setBillSort(v){ billSort=v; renderRecurring(); }
function renderTransactions() {
  let items = selectedTx().slice().map(t=>({...t, virtual:false}));
  paidEntries(selY,selM).forEach(e=>items.push(e));
  if (projectedSalary(selY,selM) > 0) items.push({ virtual:true, src:'salary', type:'Income', category:t('cat.salary'), description:t('cat.salary'), amount: salaryAmt(), date: ymStr(selY,selM)+'-01' });
  const ft = document.getElementById('txFilterType'), fc = document.getElementById('txFilterCat');
  const fType = ft ? ft.value : '', fCat = fc ? fc.value : '';
  if (fType) items = items.filter(t=>t.type===fType);
  if (fCat) items = items.filter(t=>catLabel(t.category)===fCat);
  const sb = document.getElementById('txSearch'); const q = sb ? sb.value.trim().toLowerCase() : '';
  if (q) items = items.filter(t=>((t.description||'')+' '+catLabel(t.category)).toLowerCase().indexOf(q) > -1);
  items = sortTx(items);
  const el = document.getElementById('txList');
  if (!items.length) { el.innerHTML = '<div class="empty">'+((fType||fCat||q)?t('empty.noTxFilter'):t('empty.noTxAdd'))+'</div>'; return; }
  el.innerHTML = '<div class="row-list">' + items.map(t => {
    const d = new Date(t.date+'T12:00:00').toLocaleDateString(L(),{day:'numeric',month:'short'});
    if (t.virtual) {
      if (t.src==='salary') { return '<div class="row-item click" onclick="switchTab(\'worklog\')"><div class="row-left"><div class="row-dot" style="background:'+catColor(catLabel(t.category))+'"></div><div><div class="row-name">'+esc(t.description)+' <span class="tx-src">'+window.t('salary.auto')+'</span></div><div class="row-meta">'+esc(catLabel(t.category))+' · '+d+'</div></div></div><div class="row-right"><div class="row-amount inc">+'+brl(t.amount)+'</div></div></div>'; }
      const tag = t.src==='allocation' ? window.t('src.savings') : window.t('src.bill');
      const inc = t.type==='Income';
      return '<div class="row-item click" onclick="switchTab(\'bills\')"><div class="row-left"><div class="row-dot" style="background:'+catColor(catLabel(t.category))+'"></div><div><div class="row-name">'+esc(t.description)+' <span class="tx-src">'+tag+'</span></div><div class="row-meta">'+esc(catLabel(t.category))+' · '+d+'</div></div></div><div class="row-right"><div class="row-amount'+(inc?' inc':'')+'">'+(inc?'+':'−')+brl(t.amount)+'</div></div></div>';
    }
    const inc = t.type==='Income';
    return '<div class="row-item click" onclick="editTx(\''+t.id+'\')"><div class="row-left"><div class="row-dot" style="background:'+catColor(catLabel(t.category))+'"></div><div><div class="row-name">'+esc(t.description)+'</div><div class="row-meta">'+esc(catLabel(t.category))+' · '+d+'</div></div></div><div class="row-right"><div class="row-amount'+(inc?' inc':'')+'">'+(inc?'+':'−')+brl(t.amount)+'</div></div></div>';
  }).join('') + '</div>';
}
function openTx() {
  closeFab(); editing={type:null,id:null};
  document.getElementById('txTitle').textContent=t('tx.add'); document.getElementById('txDel').style.display='none'; document.getElementById('txSave').textContent=t('tx.save');
  setType('Expense'); setDefaultDate();
  document.getElementById('txDesc').value=''; document.getElementById('txAmt').value=''; resetCategorySelect('txCat');
  document.getElementById('txOverlay').classList.add('open');
}
function editTx(id) {
  const tx = (DATA.transactions||[]).find(x=>x.id===id); if(!tx) return;
  editing={type:'transactions',id:id};
  document.getElementById('txTitle').textContent=t('tx.edit'); document.getElementById('txDel').style.display='block'; document.getElementById('txSave').textContent=t('tx.update');
  setType(tx.type);
  JB.dpSet('txDate', tx.date); document.getElementById('txDesc').value=tx.description; selectCategory('txCat', tx.category); document.getElementById('txAmt').value=tx.amount;
  document.getElementById('txOverlay').classList.add('open');
}
function setType(t) {
  txType=t;
  document.getElementById('btnExp').className='type-btn'+(t==='Expense'?' exp':'');
  document.getElementById('btnInc').className='type-btn'+(t==='Income'?' inc':'');
}
function submitTx() {
  setFormError('txErr','');
  const date=JB.dpGet('txDate'), desc=document.getElementById('txDesc').value.trim(), cat=document.getElementById('txCat').value, amt=parseAmount(document.getElementById('txAmt').value);
  if (!date||!desc||!amt||amt<=0) { setFormError('txErr',t('err.allFields')); return; }
  saveRecord('transactions', {date,description:desc,category:cat,amount:amt,type:txType}, document.getElementById('txSave'), editing.id?t('tx.update'):t('tx.save'), 'txOverlay');
}

/* ---------- Recurring bills (merged) ---------- */
function bundleForBill(id) { return (DATA.bundles||[]).filter(b=>!bundleIsDead(b)).find(b => bundleItems(b).some(it => it.type==='bill' && String(it.id)===String(id))); }
function bundleChip(id) { const bn = bundleForBill(id); return bn ? ' <span class="bundle-tag">🧩 '+esc(bn.name)+'</span>' : ''; }
function renderRecurring() {
  const bills = sortBills(activeBills()), el = document.getElementById('recurringList');
  if (!bills.length) { el.innerHTML = '<div class="empty">'+t('empty.bills')+'</div>'; return; }
  const fut = isFuture(), td = now.getDate(), dim = daysInMonth(now.getFullYear(), now.getMonth());
  const daysUntil = dd => (dd>=td ? dd-td : dim-td+dd);
  el.innerHTML = '<div class="row-list">' + bills.map(b => {
    const diff = fut ? null : daysUntil(b.dueDay), isDue = !fut && diff===0, isSoon = !fut && diff>0 && diff<=5, paid = isPaidBill(b.id);
    const cls = isDue?'due':isSoon?'soon':'';
    const dotColor = isDue ? 'var(--expense)' : isSoon ? 'var(--warning)' : catColor(catLabel(b.category));
    const dueLbl = fut ? t('bill.dayN',{d:b.dueDay}) : isDue ? t('bill.dueToday') : isSoon ? t('bill.inDays',{n:diff}) : t('bill.dayN',{d:b.dueDay});
    const once = b.installments===1;
    const meta = (b.ongoing ? esc(catLabel(b.category)) : once ? (esc(catLabel(b.category))+' · '+t('bill.onetimeMeta')) : (esc(catLabel(b.category))+' · '+t('bill.installMeta',{num:b.num,total:b.installments,pct:Math.round(b.num/b.installments*100)}))) + bundleChip(b.id);
    const sub  = (b.ongoing||once) ? dueLbl : (b.num+'/'+b.installments+' · '+dueLbl);
    const rightSub = b.overridden ? '<div class="row-sub" style="color:var(--savings)">'+t('bill.actualEst',{x:brl(b.nominal)})+'</div>' : '<div class="row-sub '+cls+'">'+sub+'</div>';
    return '<div class="row-item click'+(paid?' paid':'')+'" onclick="editBill(\''+b.id+'\')"><div class="row-left"><div class="check'+(paid?' on':'')+'" onclick="event.stopPropagation();togglePaid(\'bill\',\''+b.id+'\')">'+(paid?'✓':'')+'</div><div class="row-dot" style="background:'+dotColor+'"></div><div><div class="row-name">'+esc(b.name)+'</div><div class="row-meta">'+meta+'</div></div></div><div class="row-right"><div class="row-amount'+(b.amount<0?' inc':'')+'">'+brlSig(b.amount)+'</div>'+rightSub+'</div></div>';
  }).join('') + '</div>';
}
function setBillRecur(v) {
  billRecur = !!v;
  document.getElementById('btnRecurYes').className = 'type-btn' + (v ? ' set' : '');
  document.getElementById('btnRecurNo').className  = 'type-btn' + (!v ? ' set' : '');
  document.getElementById('billCountRow').style.display = v ? 'block' : 'none';
  document.getElementById('billAmtLbl').innerHTML = (v ? t('f.monthlyAmount') : t('f.amount')) + ' (<span class="cur-sym"></span>)';
  document.getElementById('billStartLbl').textContent = v ? t('f.startsFrom') : t('f.month');
  syncCurSyms(); updateBillPreview();
}
function openBill() {
  closeFab(); editing={type:null,id:null};
  document.getElementById('billTitle').textContent=t('bill.add'); document.getElementById('billDel').style.display='none'; document.getElementById('billSave').textContent=t('bill.save');
  document.getElementById('billName').value=''; document.getElementById('billAmt').value=''; document.getElementById('billDay').value=''; resetCategorySelect('billCat');
  document.getElementById('billCount').value=''; document.getElementById('billStart').value='';
  setBillRecur(true);
  mSync('billStart'); updateBillPreview();
  document.getElementById('billOverlay').classList.add('open');
}
function editBill(id) {
  const b = (DATA.recurring||[]).find(x=>x.id===id); if(!b) return;
  editing={type:'recurring',id:id};
  document.getElementById('billTitle').textContent=t('bill.edit'); document.getElementById('billDel').style.display='block'; document.getElementById('billSave').textContent=t('bill.update');
  document.getElementById('billName').value=b.name; document.getElementById('billAmt').value=b.amount; document.getElementById('billDay').value=b.dueDay; selectCategory('billCat', b.category);
  document.getElementById('billCount').value=b.installments>1?b.installments:''; document.getElementById('billStart').value=b.startMonth||'';
  setBillRecur(b.installments!==1);
  mSync('billStart'); updateBillPreview();
  document.getElementById('billOverlay').classList.add('open');
}
function updateBillPreview() {
  const amt=parseAmount(document.getElementById('billAmt').value)||0, cnt=parseInt(document.getElementById('billCount').value)||0;
  const prev=document.getElementById('billPreview'), start=document.getElementById('billStart').value||ymStr(selY,selM);
  if (!billRecur) {
    prev.style.display='block';
    prev.innerHTML = amt>0 ? t('preview.onetimeAmt',{amt:brl(amt),month:ymLabel(start)}) : t('preview.onetimeNo',{month:ymLabel(start)});
  } else if (cnt>0) {
    prev.style.display='block';
    prev.innerHTML = t('preview.installment',{total:brl(amt*cnt),n:cnt,month:ymLabel(ymAdd(start, cnt-1))});
  } else prev.style.display='none';
}
function submitBill() {
  setFormError('billErr','');
  const name=document.getElementById('billName').value.trim(), amt=parseAmount(document.getElementById('billAmt').value), day=parseInt(document.getElementById('billDay').value), cat=document.getElementById('billCat').value;
  const start=document.getElementById('billStart').value||ymStr(selY,selM);
  const cnt = billRecur ? (parseInt(document.getElementById('billCount').value)||0) : 1;
  if (!name||isNaN(amt)||amt===0||!day||day<1||day>31) { setFormError('billErr',t('err.billFields')); return; }
  const data = {name,amount:amt,dueDay:day,category:cat,installments:cnt,startMonth:start};
  if (editing.id && editing.type==='recurring') {
    const b = (DATA.recurring||[]).find(x => String(x.id)===String(editing.id));
    if (b && b.installments!==1 && amt!==b.amount) {
      openBillScope('amount', { formData: data });
      return;
    }
  }
  saveRecord('recurring', data, document.getElementById('billSave'), editing.id?t('bill.update'):t('bill.save'), 'billOverlay');
}

/* ---------- Budget ---------- */
function openBudget() {
  closeFab(); editing={type:null,id:null};
  document.getElementById('budTitle').textContent=t('budget.add'); document.getElementById('budDel').style.display='none'; document.getElementById('budSave').textContent=t('budget.save');
  resetCategorySelect('budCat'); document.getElementById('budAmt').value='';
  document.getElementById('budOverlay').classList.add('open');
}
function editBudget(id) {
  const b = (DATA.budget||[]).find(x=>x.id===id); if(!b) return;
  editing={type:'budget',id:id};
  document.getElementById('budTitle').textContent=t('budget.edit'); document.getElementById('budDel').style.display='block'; document.getElementById('budSave').textContent=t('budget.update');
  selectCategory('budCat', b.category); document.getElementById('budAmt').value=b.budget;
  document.getElementById('budOverlay').classList.add('open');
}
function submitBudget() {
  setFormError('budErr','');
  const cat=document.getElementById('budCat').value, amt=parseAmount(document.getElementById('budAmt').value);
  if (!cat||!amt||amt<=0) { setFormError('budErr',t('err.budgetFields')); return; }
  saveRecord('budget', {category:cat, budget:amt}, document.getElementById('budSave'), editing.id?t('budget.update'):t('budget.save'), 'budOverlay');
}

/* ---------- Goals + allocations ---------- */
function goalName(id) { if (id==='__general__') return t('savings.general'); const g=(DATA.goals||[]).find(x=>x.id===id); return g?g.name:t('misc.goal'); }
function goalCurrent(g) {
  let total = Number(g.current)||0;
  (DATA.allocations||[]).filter(a=>a.goalId===g.id).forEach(a => { total += allocationPaidSum(a); });
  return total;
}
function allocRowLbl(a) { return a.ongoing ? t('alloc.lbl.monthly') : a.installments===1 ? t('alloc.lbl.once') : (a.num+'/'+a.installments); }
function renderAllocRowHtml(a) {
  const paid = isPaid('allocation', a.id), lbl = allocRowLbl(a);
  const acts = (!paid ? '<button type="button" class="alloc-act" onclick="event.stopPropagation();skipAllocMonth(\''+a.id+'\')" title="'+esc(t('alloc.skipMonth'))+'">⏭</button>' : '')
    + '<button type="button" class="alloc-act" onclick="event.stopPropagation();editAllocation(\''+a.id+'\')" title="'+esc(t('alloc.editPlan'))+'">✎</button>';
  const orig = a.overridden ? ' <span class="alloc-orig">('+t('alloc.planned',{x:brl(a.nominal)})+')</span>' : '';
  return '<div class="alloc-row'+(paid?' paid':'')+'"><div class="check sm'+(paid?' on':'')+'" onclick="event.stopPropagation();togglePaid(\'allocation\',\''+a.id+'\')">'+(paid?'✓':'')+'</div><div class="alloc-main"><span class="alloc-amt" onclick="event.stopPropagation();promptAllocAmount(\''+a.id+'\')">'+brl(a.amount)+'</span><span class="alloc-lbl"> · '+lbl+'</span>'+orig+'</div><div class="alloc-acts">'+acts+'</div></div>';
}
function renderGoals() {
  const tdy = todayStr();
  const goals = (DATA.goals||[]).filter(g => !(g.deadline && g.deadline < tdy));
  const el = document.getElementById('goalsList');
  if (!goals.length) { el.innerHTML = '<div class="card empty">'+t('empty.goals')+'</div>'; return; }
  const allocs = activeAllocations();
  el.innerHTML = goals.map(g => {
    const cur = goalCurrent(g), pct = g.target>0?Math.min(cur/g.target*100,100):0;
    const dl = g.deadline ? Math.ceil((new Date(g.deadline+'T12:00:00')-new Date())/86400000) : null;
    const dlt = dl===null?'':dl>0?t('goal.daysLeft',{n:dl,date:g.deadline}):dl===0?t('goal.dueToday'):'';
    const mine = allocs.filter(a=>a.goalId===g.id);
    const _rate = mine.filter(a=>a.ongoing).reduce((s,a)=>s+a.amount,0);
    let eta=''; if (_rate>0 && cur<g.target) { const _ml=Math.ceil((g.target-cur)/_rate); const _d=new Date(now.getFullYear(), now.getMonth()+_ml, 1); eta=t('goal.eta',{date:_d.toLocaleString(L(),{month:'short',year:'numeric'})}); }
    const allocHtml = mine.map(a => renderAllocRowHtml(a)).join('');
    return '<div class="goal-card"><div class="goal-bar-top" style="background:'+g.color+'"></div>'
      + '<div class="goal-body" onclick="editGoal(\''+g.id+'\')"><div class="goal-name">'+esc(g.name)+'</div><div class="goal-value" style="color:'+g.color+'">'+brl(cur)+'</div><div class="goal-meta"><span>'+t('goal.of',{x:brl(g.target)})+'</span><span>'+Math.round(pct)+'%</span></div><div class="track"><div class="fill" style="width:'+pct+'%;background:'+g.color+'"></div></div>'+(dlt?'<div class="goal-deadline">'+dlt+'</div>':'')+(eta?'<div class="goal-deadline">'+eta+'</div>':'')+'</div>'
      + '<div class="goal-allocs">'+allocHtml+'<button class="alloc-add" onclick="openAllocation(\''+g.id+'\')">'+t('goal.planSaving')+'</button></div></div>';
  }).join('');
}
function openGoal() {
  closeFab(); editing={type:null,id:null};
  document.getElementById('goalTitle').textContent=t('goal.add'); document.getElementById('goalDel').style.display='none'; document.getElementById('goalSave').textContent=t('goal.save');
  document.getElementById('goalName').value=''; document.getElementById('goalTarget').value=''; document.getElementById('goalCurrent').value=''; JB.dpSet('goalDeadline',''); document.getElementById('goalColor').value='#818cf8';
  document.getElementById('goalOverlay').classList.add('open');
}
function editGoal(id) {
  const g = (DATA.goals||[]).find(x=>x.id===id); if(!g) return;
  editing={type:'goals',id:id};
  document.getElementById('goalTitle').textContent=t('goal.edit'); document.getElementById('goalDel').style.display='block'; document.getElementById('goalSave').textContent=t('goal.update');
  document.getElementById('goalName').value=g.name; document.getElementById('goalTarget').value=g.target; document.getElementById('goalCurrent').value=g.current; JB.dpSet('goalDeadline', g.deadline||'');
  document.getElementById('goalColor').value=/^#[0-9a-fA-F]{6}$/.test(g.color)?g.color:'#818cf8';
  document.getElementById('goalOverlay').classList.add('open');
}
function submitGoal() {
  setFormError('goalErr','');
  const name=document.getElementById('goalName').value.trim(), target=parseAmount(document.getElementById('goalTarget').value), current=parseAmount(document.getElementById('goalCurrent').value)||0, deadline=JB.dpGet('goalDeadline'), color=document.getElementById('goalColor').value;
  if (!name||!target||target<=0) { setFormError('goalErr',t('err.goalFields')); return; }
  saveRecord('goals', {name,target,current,deadline,color}, document.getElementById('goalSave'), editing.id?t('goal.update'):t('goal.save'), 'goalOverlay');
}
function openAllocation(goalId) {
  editing={type:null,id:null}; allocGoalId=goalId;
  document.getElementById('allocTitle').textContent=t('alloc.add'); document.getElementById('allocSub').textContent=t('alloc.toward',{name:goalName(goalId)}); document.getElementById('allocDel').style.display='none'; document.getElementById('allocSave').textContent=t('alloc.save');
  document.getElementById('allocAmt').value=''; document.getElementById('allocRec').value='monthly'; document.getElementById('allocCount').value=''; document.getElementById('allocStart').value=ymStr(selY,selM); mSync('allocStart');
  allocRecChange();
  document.getElementById('allocOverlay').classList.add('open');
}
function editAllocation(id) {
  const a = (DATA.allocations||[]).find(x=>x.id===id); if(!a) return;
  editing={type:'allocations',id:id}; allocGoalId=a.goalId;
  document.getElementById('allocTitle').textContent=t('alloc.edit'); document.getElementById('allocSub').textContent=t('alloc.toward',{name:goalName(a.goalId)}); document.getElementById('allocDel').style.display='block'; document.getElementById('allocSave').textContent=t('alloc.update');
  document.getElementById('allocAmt').value=a.amount;
  const rec = a.installments===0?'monthly':a.installments===1?'once':'fixed';
  document.getElementById('allocRec').value=rec; document.getElementById('allocCount').value=rec==='fixed'?a.installments:''; document.getElementById('allocStart').value=a.startMonth; mSync('allocStart');
  allocRecChange();
  document.getElementById('allocOverlay').classList.add('open');
}
function allocRecChange() { document.getElementById('allocCountRow').style.display = document.getElementById('allocRec').value==='fixed' ? 'block' : 'none'; }
function submitAllocation() {
  setFormError('allocErr','');
  const amt=parseAmount(document.getElementById('allocAmt').value), rec=document.getElementById('allocRec').value, start=document.getElementById('allocStart').value||ymStr(selY,selM);
  if (!amt||amt<=0) { setFormError('allocErr',t('err.amount')); return; }
  let inst='';
  if (rec==='once') inst=1;
  else if (rec==='fixed') { inst=parseInt(document.getElementById('allocCount').value)||0; if (inst<1) { setFormError('allocErr',t('err.numMonths')); return; } }
  saveRecord('allocations', {goalId:allocGoalId, amount:amt, installments:inst, startMonth:start}, document.getElementById('allocSave'), editing.id?t('alloc.update'):t('alloc.save'), 'allocOverlay');
}

/* ---------- Payment bundles ---------- */
function normType(t) { return (t==='recurring'||t==='installment') ? 'bill' : t; }
function bundleItems(b) { return (b.items||[]).map(it => ({ type: normType(it.type), id: it.id })); }
function bundleRelevantItems(b) {
  const billIds = new Set(activeBills().map(x=>x.id)), allocIds = new Set(activeAllocations().map(x=>x.id));
  return bundleItems(b).filter(it => it.type==='bill' ? billIds.has(it.id) : it.type==='allocation' ? allocIds.has(it.id) : false);
}
function bundleItemName(it) {
  if (it.type==='bill') { const b=(DATA.recurring||[]).find(x=>x.id===it.id); return b?b.name:t('misc.removed'); }
  if (it.type==='allocation') { const a=(DATA.allocations||[]).find(x=>x.id===it.id); return a?t('bundle.savingsTo',{goal:goalName(a.goalId)}):t('misc.removed'); }
  return t('misc.unknown');
}
function bundleItemAmount(it) {
  if (it.type==='bill') { const b=activeBills().find(x=>x.id===it.id); return b?b.amount:0; }
  if (it.type==='allocation') { const a=activeAllocations().find(x=>x.id===it.id); return a?a.amount:0; }
  return 0;
}
function itemPaid(it) { return it.type==='bill' ? isPaidBill(it.id) : isPaid(it.type, it.id); }
function bundleIsDead(b) {
  const items = bundleItems(b);
  if (!items.length) return true;
  const curReal = ymStr(now.getFullYear(), now.getMonth());
  return items.every(it => {
    if (it.type==='bill') { const x=(DATA.recurring||[]).find(y=>y.id===it.id); if(!x) return true; if(x.installments<=0) return false; return monthDiff(x.startMonth,curReal)>=x.installments; }
    if (it.type==='allocation') { const x=(DATA.allocations||[]).find(y=>y.id===it.id); if(!x) return true; if(x.installments<=0) return false; return monthDiff(x.startMonth,curReal)>=x.installments; }
    return true;
  });
}
function renderBundles() {
  const bundles = (DATA.bundles||[]).filter(b => !bundleIsDead(b)), el = document.getElementById('bundleList');
  if (!bundles.length) { el.innerHTML = '<div class="empty">'+t('empty.bundles')+'</div>'; return; }
  el.innerHTML = bundles.map(b => {
    const rel = bundleRelevantItems(b), total = rel.reduce((s,it)=>s+bundleItemAmount(it),0);
    const paidCount = rel.filter(itemPaid).length, allPaid = rel.length>0 && paidCount===rel.length;
    const itemsHtml = rel.length ? rel.map(it => '<div class="bundle-item'+(itemPaid(it)?' paid':'')+'"><span>'+esc(bundleItemName(it))+'</span><span>'+brlSig(bundleItemAmount(it))+'</span></div>').join('') : '<div class="bundle-item" style="color:var(--muted)"><span>'+t('bundle.noActive')+'</span><span></span></div>';
    return '<div class="card bundle-card"><div class="bundle-head">'
      + '<div class="check'+(allPaid?' on':'')+'" onclick="event.stopPropagation();toggleBundle(\''+b.id+'\')">'+(allPaid?'✓':'')+'</div>'
      + '<div class="bundle-title" onclick="editBundle(\''+b.id+'\')"><div class="bundle-name'+(allPaid?' paid':'')+'">'+esc(b.name)+'</div>'+(b.payee?'<div class="bundle-payee">→ '+esc(b.payee)+'</div>':'')+'</div>'
      + '<div class="bundle-total" onclick="editBundle(\''+b.id+'\')">'+brlSig(total)+'<div class="bundle-prog">'+t('bundle.paidCount',{paid:paidCount,total:rel.length})+'</div></div>'
      + '</div><div class="bundle-items">'+itemsHtml+'</div></div>';
  }).join('');
}
function toggleBundle(id) {
  const b = (DATA.bundles||[]).find(x=>x.id===id); if(!b) return;
  const m = ymStr(selY,selM), rel = bundleRelevantItems(b); if(!rel.length) return;
  if (rel.every(itemPaid)) { rel.forEach(it => applyPaid(it.type, it.id, false, m)); renderAll(); return; } // untick all, instant
  openGroupConfirm('✓ '+b.name, rel.filter(it=>!itemPaid(it)).map(grpItemFor));
}
function markAllPaid() {
  const unpaid = activeBills().filter(b=>!isPaidBill(b.id));
  if (!unpaid.length) { showToast(t('toast.allPaid')); return; }
  const dim = daysInMonth(selY,selM);
  openGroupConfirm(t('grp.markAllBills'), unpaid.map(b => ({ type:'bill', id:b.id, name:b.name, amount:b.amount, nominal:b.amount, color:catColor(catLabel(b.category)), occDate: dayStr(selY,selM, Math.min(b.dueDay||1, dim)), edited:false })));
}
function grpItemFor(it) {
  const dim = daysInMonth(selY,selM);
  if (it.type==='bill') { const b=(DATA.recurring||[]).find(x=>x.id===it.id), amt=bundleItemAmount(it); return { type:'bill', id:it.id, name:(b?b.name:'(bill)'), amount:amt, nominal:amt, color:catColor(catLabel(b?b.category:'')), occDate: dayStr(selY,selM, Math.min((b&&b.dueDay)||1, dim)), edited:false }; }
  const a=(DATA.allocations||[]).find(x=>x.id===it.id), amt=bundleItemAmount(it);
  return { type:'allocation', id:it.id, name:'💰 '+goalName(a?a.goalId:null), amount:amt, nominal:amt, color:catColor(t('cat.savings')), occDate: ymStr(selY,selM)+'-01', edited:false };
}
let grpCtx = null;
function openGroupConfirm(title, items) {
  if (!items || !items.length) { showToast(t('toast.nothingPaid')); return; }
  grpCtx = { title, items, month: ymStr(selY,selM), overdue: isPast(), mode:'today', expanded:false };
  document.getElementById('grpTitle').textContent = title;
  const dr = document.getElementById('grpDateRow');
  if (grpCtx.overdue) { dr.style.display='flex'; document.getElementById('grpBackLbl').textContent = new Date(selY,selM,1).toLocaleString(L(),{month:'short'}); setGrpDate('today'); }
  else dr.style.display='none';
  document.getElementById('grpList').style.display='none';
  document.getElementById('grpAdjust').textContent=t('grp.adjust');
  renderGrpSummary();
  document.getElementById('groupOverlay').classList.add('open');
}
function renderGrpSummary() {
  const total = grpCtx.items.reduce((s,it)=>s+it.amount,0), n = grpCtx.items.length;
  const mlabel = new Date(selY,selM,1).toLocaleString(L(),{month:'long'});
  document.getElementById('grpSummary').innerHTML =
    '<div class="grp-hero-label">'+t('grp.itemsMonth',{n:n,month:mlabel})+'</div>'
    + '<div class="grp-hero-total">'+brl(total)+'</div>'
    + '<div class="grp-hero-cap">'+t('grp.totalCap')+'</div>';
}
function toggleGrpAdjust() {
  grpCtx.expanded = !grpCtx.expanded;
  const list = document.getElementById('grpList');
  if (grpCtx.expanded) {
    const cur = (CURRENCIES[currencyTo()]||{symbol:''}).symbol;
    list.style.display='flex';
    list.innerHTML = grpCtx.items.map((it,i)=>'<div class="grp-row"><span class="grp-dot" style="background:'+(it.color||'var(--muted)')+'"></span><span class="grp-name">'+esc(it.name)+'</span><div class="grp-amt-wrap"><span class="grp-cur">'+cur+'</span><input type="number" class="grp-amt" step="0.01" value="'+it.amount+'" oninput="grpAmt('+i+',this.value)"></div></div>').join('');
    document.getElementById('grpAdjust').textContent=t('action.done');
  } else { list.style.display='none'; document.getElementById('grpAdjust').textContent=t('grp.adjust'); }
}
function grpAmt(i, v) { const n=parseFloat(v); const it=grpCtx.items[i]; grpCtx.items[i].amount = isNaN(n)?0:(it.type==='bill'?n:Math.max(n,0)); grpCtx.items[i].edited = true; renderGrpSummary(); }
function setGrpDate(which) { grpCtx.mode = which==='back'?'back':'today'; document.getElementById('grpDateToday').className='cc-date-btn'+(which!=='back'?' on':''); document.getElementById('grpDateBack').className='cc-date-btn'+(which==='back'?' on':''); }
function confirmGroup() {
  if (!grpCtx) return;
  const m = grpCtx.month, n = grpCtx.items.length;
  grpCtx.items.forEach(it => { const pd = grpCtx.mode==='back' ? it.occDate : todayStr(); applyPaid(it.type, it.id, true, m, it.edited ? it.amount : undefined, pd); });
  grpCtx = null; closeOverlay('groupOverlay'); renderAll(); showToast(t('toast.nMarkedPaid',{n:n}));
}
function renderBundleChecklist(selected) {
  const sel = new Set(bundleItems({items:selected||[]}).map(it=>it.type+':'+it.id));
  let html = '';
  (DATA.recurring||[]).forEach(b => { const on=sel.has('bill:'+b.id), tag=b.installments>0?'📦':'🔄', suf=b.installments>0?(' ('+b.installments+'x)'):'/mo'; html += '<label class="bun-check"><input type="checkbox" data-type="bill" data-id="'+b.id+'"'+(on?' checked':'')+'> '+tag+' '+esc(b.name)+' · '+brl(b.amount)+suf+'</label>'; });
  (DATA.allocations||[]).forEach(a => { const on=sel.has('allocation:'+a.id); html += '<label class="bun-check"><input type="checkbox" data-type="allocation" data-id="'+a.id+'"'+(on?' checked':'')+'> 💰 '+esc(goalName(a.goalId))+' · '+brl(a.amount)+'</label>'; });
  document.getElementById('bunItems').innerHTML = html || '<div class="empty">'+t('empty.bundleChecklist')+'</div>';
}
function collectBundleItems() { return [...document.querySelectorAll('#bunItems input[type=checkbox]')].filter(c=>c.checked).map(c=>({type:c.dataset.type, id:c.dataset.id})); }
function openBundle() {
  closeFab(); editing={type:null,id:null};
  document.getElementById('bunTitle').textContent=t('bundle.add'); document.getElementById('bunDel').style.display='none'; document.getElementById('bunSave').textContent=t('bundle.save');
  document.getElementById('bunName').value=''; document.getElementById('bunPayee').value=''; renderBundleChecklist([]);
  document.getElementById('bunOverlay').classList.add('open');
}
function editBundle(id) {
  const b = (DATA.bundles||[]).find(x=>x.id===id); if(!b) return;
  editing={type:'bundles',id:id};
  document.getElementById('bunTitle').textContent=t('bundle.edit'); document.getElementById('bunDel').style.display='block'; document.getElementById('bunSave').textContent=t('bundle.update');
  document.getElementById('bunName').value=b.name; document.getElementById('bunPayee').value=b.payee||''; renderBundleChecklist(b.items||[]);
  document.getElementById('bunOverlay').classList.add('open');
}
function submitBundle() {
  setFormError('bunErr','');
  const name=document.getElementById('bunName').value.trim(), payee=document.getElementById('bunPayee').value.trim(), items=collectBundleItems();
  if (!name) { setFormError('bunErr',t('err.bundleName')); return; }
  if (!items.length) { setFormError('bunErr',t('err.bundleItems')); return; }
  saveRecord('bundles', {name,payee,items}, document.getElementById('bunSave'), editing.id?t('bundle.update'):t('bundle.save'), 'bunOverlay');
}

/* ---------- Income vs Budget visualizer ---------- */
function monthIncome(y,m) { return (DATA.transactions||[]).filter(t=>t.type==='Income' && txInMonth(t,y,m)).reduce((s,t)=>s+t.amount,0) + paidIncomeCredit(y,m); }
/* ---------- Recurring salary (set & forget) ---------- */
function salaryAmt() { return Number(P().salary_amount) || 0; }
function salaryStart() { return String(P().salary_start||'').replace(/^m/,''); }
function salaryEnd() { return String(P().salary_end||'').replace(/^m/,''); }
function salaryActiveIn(y,m) { if (salaryAmt() <= 0) return false; const cur=ymStr(y,m); const st=salaryStart(); if (st && monthDiff(st,cur) < 0) return false; const en=salaryEnd(); if (en && monthDiff(cur,en) < 0) return false; return true; }
function loggedSalaryIn(y,m) { const c=t('cat.salary'); return (DATA.transactions||[]).some(tx=>tx.type==='Income' && String(tx.category)===c && txInMonth(tx,y,m)); }
// Projected only when no actual salary is logged that month, so a logged salary always wins (no double-count).
function projectedSalary(y,m) { return (salaryActiveIn(y,m) && !loggedSalaryIn(y,m)) ? salaryAmt() : 0; }
function incomeFor(y,m) { return monthIncome(y,m) + projectedSalary(y,m); }
function monthExpense(y,m) { return (DATA.transactions||[]).filter(t=>t.type==='Expense' && txInMonth(t,y,m)).reduce((s,t)=>s+t.amount,0) + paidExpenseOnly(y,m); }
function avgMonthlyExpense(n) { let sum=0,cnt=0; for(let k=1;k<=n;k++){ const d=new Date(now.getFullYear(), now.getMonth()-k, 1), y=d.getFullYear(), mm=d.getMonth(); if (monthHasData(y,mm)) { sum+=monthExpense(y,mm); cnt++; } } return cnt ? sum/cnt : 0; }
function runwayMonths() { const avg=avgMonthlyExpense(3); if (avg<=0) return null; return savingsTotal()/avg; }
function normAmount(inp) { const n=parseAmount(inp.value); if (!isNaN(n)) inp.value = String(Math.round(n*100)/100); }
function renderIncomeBudget(elId, detailed) {
  const el = document.getElementById(elId); if (!el) return;
  let income = incomeFor(selY, selM), basedOnLast = false;
  if (income <= 0) {
    const pd = new Date(selY, selM-1, 1), li = incomeFor(pd.getFullYear(), pd.getMonth());
    if (li > 0) { income = li; basedOnLast = true; }
  }
  const budgetTotal = (DATA.budget||[]).reduce((s,b)=>s+b.budget,0);
  const allocTotal = activeAllocations().reduce((s,a)=>s+a.amount,0);
  const committed = budgetTotal + allocTotal;
  if (income <= 0) {
    el.innerHTML = '<div class="ivb-empty">'+t('ivb.noIncome',{committed:brl(committed),detail:(committed>0?t('ivb.commitsDetail',{budgets:brl(budgetTotal),savings:brl(allocTotal)}):'.')})+'</div>';
    return;
  }
  const headroom = income - committed;
  const scale = Math.max(income, committed, 1);
  const wB = budgetTotal/scale*100, wA = allocTotal/scale*100;
  let segs = '';
  if (wB>0) segs += '<div class="ivb-seg budget" style="width:'+wB+'%"></div>';
  if (wA>0) segs += '<div class="ivb-seg alloc" style="width:'+wA+'%"></div>';
  if (headroom >= 0) { const wH = headroom/scale*100; if (wH>0) segs += '<div class="ivb-seg head" style="width:'+wH+'%"></div>'; }
  else { segs += '<div class="ivb-seg over" style="width:'+((-headroom)/scale*100)+'%"></div>'; }
  const marker = headroom < 0 ? '<div class="ivb-marker" style="left:'+(income/scale*100)+'%" title="'+t('ivb.incomeTitle',{x:brl(income)})+'"></div>' : '';
  const hColor = headroom < 0 ? 'var(--expense)' : 'var(--income)';
  const hNum = (headroom<0?'−':'')+brl(headroom);
  const hCap = headroom < 0 ? t('ivb.overIncome') : t('ivb.unallocated');
  let legend = '<div class="ivb-legend">'
    + '<span><span class="ivb-key" style="background:var(--primary)"></span>'+t('ivb.budgets',{x:brl(budgetTotal)})+'</span>'
    + '<span><span class="ivb-key" style="background:var(--savings)"></span>'+t('ivb.savings',{x:brl(allocTotal)})+'</span>'
    + (headroom>=0 ? '<span><span class="ivb-key" style="background:var(--border)"></span>'+t('ivb.headroom',{x:brl(headroom)})+'</span>'
                   : '<span><span class="ivb-key" style="background:var(--expense)"></span>'+t('ivb.over',{x:brl(-headroom)})+'</span>')
    + '</div>';
  let brk = '';
  if (detailed) {
    const rows = (DATA.budget||[]).slice().sort((a,b)=>b.budget-a.budget).map(b =>
      '<div class="ivb-brk-row"><span class="ivb-brk-dot" style="background:'+catColor(b.category)+'"></span><span class="ivb-brk-name">'+esc(b.category)+'</span><span class="ivb-brk-val">'+brl(b.budget)+'</span></div>').join('');
    const allocRow = allocTotal>0 ? '<div class="ivb-brk-row"><span class="ivb-brk-dot" style="background:var(--savings)"></span><span class="ivb-brk-name">'+t('ivb.plannedSavings')+'</span><span class="ivb-brk-val">'+brl(allocTotal)+'</span></div>' : '';
    brk = (rows||allocRow) ? '<div class="ivb-brk">'+rows+allocRow+'</div>' : '';
  }
  el.innerHTML =
    '<div class="ivb-top"><div class="ivb-income">'+t('ivb.expectedIncome')+'<strong>'+brl(income)+'</strong>'+(basedOnLast?'<div class="ivb-note">'+t('ivb.basedLast')+'</div>':'')+'</div>'
    + '<div class="ivb-headroom"><div class="num" style="color:'+hColor+'">'+hNum+'</div><div class="cap">'+hCap+'</div></div></div>'
    + '<div class="ivb-bar">'+segs+marker+'</div>'
    + legend + brk;
}

/* ---------- This-week digest (real today) ---------- */
function activeBillsAt(y,m) {
  const cur = ymStr(y,m);
  return (DATA.recurring||[]).map(b => {
    if (paymentPaidFor(['skip'], b.id, cur)) return null;
    if (b.installments<=0) return billStarted(b, cur) ? {...b, ongoing:true} : null;
    const diff = monthDiff(b.startMonth, cur); if (diff<0||diff>=b.installments) return null;
    return {...b, ongoing:false, num:diff+1};
  }).filter(Boolean);
}
function overdueItems() {
  const out = [], ry=now.getFullYear(), rm=now.getMonth(), td=now.getDate(), curYMs=ymStr(ry,rm);
  activeBillsAt(ry,rm).forEach(b => { if (b.dueDay<td && !paymentPaidFor(['bill','recurring','installment'], b.id, curYMs)) out.push({name:b.name, amount:b.amount, ym:curYMs, lbl:t('digest.thisMonth'), tab:'bills'}); });
  for (let back=1; back<=3; back++) {
    const d=new Date(ry, rm-back, 1), y=d.getFullYear(), mo=d.getMonth(), ym=ymStr(y,mo), lbl=d.toLocaleString(L(),{month:'short'});
    activeBillsAt(y,mo).forEach(b => { if (!paymentPaidFor(['bill','recurring','installment'], b.id, ym)) out.push({name:b.name, amount:b.amount, ym:ym, lbl:lbl, tab:'bills'}); });
    activeAllocationsAt(y,mo).forEach(a => { if (!paymentPaidFor(['allocation'], a.id, ym)) out.push({name:t('digest.savingsTo',{goal:goalName(a.goalId)}), amount:a.amount, ym:ym, lbl:lbl, tab:'bills'}); });
  }
  return out;
}
function gotoOverdue(ym, tab) { const a=ym.split('-'); selY=Number(a[0]); selM=Number(a[1])-1; editingHoursDate=null; setDefaultDate(); closeMonthPicker(); renderAll(); switchTab(tab); }
function renderWeekDigest() {
  const el = document.getElementById('weekDigest'); if (!el) return;
  const ry = now.getFullYear(), rm = now.getMonth(), td = now.getDate(), dim = daysInMonth(ry, rm);
  const within = [], BILLFAM = ['bill','recurring','installment'];
  const curYM = ymStr(ry, rm);
  activeBillsAt(ry, rm).forEach(b => { const du = b.dueDay - td; if (du>=0 && du<=7 && !paymentPaidFor(BILLFAM, b.id, curYM)) within.push({b, du}); });
  const nd = new Date(ry, rm+1, 1), ndYM = ymStr(nd.getFullYear(), nd.getMonth());
  activeBillsAt(nd.getFullYear(), nd.getMonth()).forEach(b => { const du = dim - td + b.dueDay; if (du>=0 && du<=7 && !paymentPaidFor(BILLFAM, b.id, ndYM)) within.push({b, du}); });
  within.sort((a,b)=>a.du-b.du);
  const overdue = overdueItems();
  let html = '';
  if (overdue.length) {
    html += '<div class="od-head" style="color:var(--expense)">'+t('digest.overdueHead')+'</div><div class="row-list">' + overdue.map(o =>
      '<div class="row-item click" onclick="gotoOverdue(\''+o.ym+'\',\''+o.tab+'\')"><div class="row-left"><div class="row-dot" style="background:var(--expense)"></div><div><div class="row-name">'+esc(o.name)+'</div><div class="row-meta">'+o.lbl+'</div></div></div><div class="row-right"><div class="row-amount">'+brl(o.amount)+'</div><div class="row-sub due">'+t('digest.overdue')+'</div></div></div>'
    ).join('') + '</div>';
  }
  if (within.length) {
    if (overdue.length) html += '<div class="od-head" style="margin-top:16px">'+t('digest.dueHead')+'</div>';
    html += '<div class="row-list">' + within.map(({b,du}) => {
      const lbl = du===0?t('digest.dueToday'):du===1?t('digest.tomorrow'):t('digest.inDays',{n:du}), cls = du===0?'due':du<=3?'soon':'', dot = du===0?'var(--expense)':du<=3?'var(--warning)':catColor(b.category);
      return '<div class="row-item click" onclick="switchTab(\'bills\')"><div class="row-left"><div class="row-dot" style="background:'+dot+'"></div><div><div class="row-name">'+esc(b.name)+'</div><div class="row-meta">'+esc(b.category)+'</div></div></div><div class="row-right"><div class="row-amount'+(b.amount<0?' inc':'')+'">'+brlSig(b.amount)+'</div><div class="row-sub '+cls+'">'+lbl+'</div></div></div>';
    }).join('') + '</div>';
  }
  el.innerHTML = html || '<div class="empty">'+t('digest.allClear')+'</div>';
}

/* ---------- Month-over-month deltas (Money tab) ---------- */
function renderMoMDeltas() {
  const el = document.getElementById('momRow'); if (!el) return;
  const cur = selectedTx();
  const inc = incomeFor(selY,selM);
  const exp = cur.filter(t=>t.type==='Expense' && !txIsProjected(t)).reduce((s,t)=>s+t.amount,0) + paidExpenseOnly(selY,selM);
  const pd = new Date(selY, selM-1, 1), py=pd.getFullYear(), pm=pd.getMonth();
  const ptx = (DATA.transactions||[]).filter(t=>txInMonth(t,py,pm));
  const pinc = incomeFor(py,pm);
  const pexp = ptx.filter(t=>t.type==='Expense' && !txIsProjected(t)).reduce((s,t)=>s+t.amount,0) + paidExpenseOnly(py,pm);
  el.innerHTML = momCard('Income', inc, pinc, 'up') + momCard('Expenses', exp, pexp, 'down') + momCard('Balance', inc-exp, pinc-pexp, 'up');
}
function momCard(label, cur, prev, goodDir) {
  let cls='mom-flat', txt=t('mom.same');
  if (prev===0 && cur===0) { txt='—'; }
  else {
    const pct = prev!==0 ? (cur-prev)/Math.abs(prev)*100 : 100;
    const ap = Math.abs(pct);
    if (ap < 3) { txt=t('mom.same'); cls='mom-flat'; }
    else { const up = cur>prev; const good = goodDir==='up' ? up : !up; cls = good?'mom-good':'mom-bad'; txt = (up?'▲':'▼')+' '+Math.round(ap)+'%'; }
  }
  const valColor = label==='Income'?'var(--income)':label==='Expenses'?'var(--expense)':'var(--primary)';
  const valTxt = (label==='Balance' && cur<0?'−':'')+brl(cur);
  const dispLabel = label==='Income'?t('sum.income'):label==='Expenses'?t('sum.expenses'):t('sum.balance');
  return '<div class="mom-card"><div class="mom-label">'+dispLabel+'</div><div class="mom-value" style="color:'+valColor+'">'+valTxt+'</div><div class="mom-badge '+cls+'">'+txt+'</div><div class="mom-prev">'+t('mom.vsLast',{x:brl(prev)})+'</div></div>';
}

/* ---------- Tabs & theme ---------- */
function switchTab(name) {
  if (currentTab==='worklog' && name!=='worklog' && worklogDirty) {
    worklogDirty=false;
    var _inc=computeIncome();
    if (_inc.total>0) {
      var _p=new Date(selY,selM+1,1), _pn=_p.toLocaleString(L(),{month:'long',year:'numeric'});
      showNudge('⏱ Jornada alterada', 'Você ajustou a Jornada mas não lançou. Lançar <strong>'+brl(_inc.total)+'</strong> em '+_pn+'?', 'Lançar', function(){ logIncome(); });
    }
  }
  if (name==='worklog') worklogDirty=false;
  currentTab = name;
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===name));
  document.querySelectorAll('.tab-page').forEach(p=>p.classList.toggle('active', p.id==='tab-'+name));
  if (name==='overview') renderBreakdown();
}
const FINANCE_VAULT_SKIN = [{ id:'vault', name:'Vault', bg:'#14140f', card:'#222218', accent:'#cba86a', text:'#e9e4d6' }];
function financeSkinLabel(id) {
  if (id === 'vault') return 'Vault';
  const s = (JB.SKINS || []).find(x => x.id === id);
  return s ? s.name : id;
}
function migrateFinanceTheme() {
  if (!DATA || !DATA.settings) return;
  const hasSkin = localStorage.getItem('jb_skin_finance') != null;
  const hasMode = localStorage.getItem('jb_mode_finance') != null;
  if (!hasSkin && DATA.settings.skin) JB.setSkin('finance', DATA.settings.skin);
  if (!hasMode && JB.getSkin('finance') === 'default' && DATA.settings.theme) {
    JB.setMode('finance', DATA.settings.theme === 'light' ? 'light' : 'dark');
  }
}
function syncFinanceThemeToSheet(skinToast) {
  if (!DATA || !DATA.settings) return;
  const skin = JB.getSkin('finance'), mode = JB.getMode('finance');
  if (DATA.settings.skin !== skin) {
    DATA.settings.skin = skin;
    jbSaveSetting('skin', skin);
    if (skinToast) showToast(t('toast.theme', { name: financeSkinLabel(skin) }));
  }
  if (DATA.settings.theme !== mode) {
    DATA.settings.theme = mode;
    jbSaveSetting('theme', mode);
  }
}
function applyFinanceTheme() {
  JB.applySkin('finance');
  updateThemeBtn();
}
function updateThemeBtn() {
  const btn = document.getElementById('themeBtn');
  if (!btn) return;
  btn.style.display = '';
  btn.textContent = JB.getMode('finance') === 'light' ? '☀️' : '🌙';
}
function toggleTheme() {
  JB.toggleMode('finance');
  syncFinanceThemeToSheet(false);
  updateThemeBtn();
}
function renderThemePicker() {
  const el = document.getElementById('themeGrid');
  if (!el) return;
  const onSync = function (toast) { syncFinanceThemeToSheet(toast); updateThemeBtn(); };
  JB.renderSkinPicker('finance', el, function () { onSync(true); }, { extraSkins: FINANCE_VAULT_SKIN, onModeChange: function () { onSync(false); } });
}

/* ---------- FAB / overlay / shared save / delete ---------- */
function toggleFab() { fabOpen=!fabOpen; document.getElementById('fab').classList.toggle('open',fabOpen); document.getElementById('fabMenu').classList.toggle('open',fabOpen); }
function closeFab() { fabOpen=false; document.getElementById('fab').classList.remove('open'); document.getElementById('fabMenu').classList.remove('open'); }
function clearFormErrors() { document.querySelectorAll('.form-err').forEach(e=>{ e.textContent=''; e.classList.remove('show'); }); }
function closeOverlay(id) { if (id==='billDelOverlay') billScopeCtx=null; if (mOpen) mOpen(); document.getElementById(id).classList.remove('open'); clearFormErrors(); }
function closeAllOverlays() { if (mOpen) mOpen(); document.querySelectorAll('.overlay').forEach(o=>o.classList.remove('open')); clearFormErrors(); }
function bgClose(e,id) { if (e.target===document.getElementById(id)) closeOverlay(id); }
function saveRecord(type, data, btn, label, overlayId) {
  const isEdit = !!(editing.id && editing.type===type), editId = editing.id;
  const refresh = () => { rebuildCatColors(); populateCategoryDropdowns(); renderAll(); renderCatList(); };
  JB.persist({
    btn: btn,
    busy: t('action.saving'),
    run: function () {
      return isEdit ? jbRun('updateRecord', type, editId, data) : jbRun('addRecord', type, data);
    },
    onSuccess: function (res) {
      if (isEdit) {
        const arr = DATA[type] || [], i = arr.findIndex(x => String(x.id) === String(editId));
        if (i > -1) arr[i] = Object.assign({}, arr[i], data, { id: editId });
      } else {
        (DATA[type] = DATA[type] || []).push(Object.assign({}, data, { id: (res && res.id) }));
      }
      editing = { type: null, id: null };
      closeOverlay(overlayId);
      refresh();
      showToast(isEdit ? t('toast.updated2') : t('toast.saved'));
    },
    onError: function (e) {
      showToast(t('err.prefix') + e.message, 'error');
      reload();
    }
  });
}
function deleteCurrent(type) {
  if (!editing.id) return;
  const id = editing.id;
  const rec = (DATA[type]||[]).find(x=>String(x.id)===String(id));
  showConfirm(t('confirm.deleteItemTitle'), t('confirm.deleteCanUndo'), () => {
    JB.persist({
      run: function () { return jbRun('deleteRecord', type, id); },
      onSuccess: function () {
        closeAllOverlays(); editing={type:null,id:null};
        const arr=DATA[type]||[], i=arr.findIndex(x=>String(x.id)===String(id)); if (i>-1) arr.splice(i,1);
        rebuildCatColors(); populateCategoryDropdowns(); renderAll(); renderCatList();
        showToast(t('toast.deleted'), null, rec ? function(){ undoDelete(type, rec); } : null);
      },
      onError: function (e) {
        showToast(t('err.prefix')+e.message, 'error');
        reload();
      }
    });
  });
}
function undoDelete(type, rec) {
  const data=Object.assign({}, rec); delete data.id;
  JB.persist({
    run: function () { return jbRun('addRecord', type, data); },
    onSuccess: function () { showToast(t('toast.restored')); reload(); },
    onError: function (e) { showToast(t('err.prefix')+e.message,'error'); }
  });
}

/* ---------- Settings: Income profile ---------- */
let setFormMode = 'hourly', setFormConvert = true;
function openSettings() {
  const s = DATA.settings;
  setFormMode = mode(); setFormConvert = convertEnabled();
  const opts = Object.keys(CURRENCIES).map(c=>'<option value="'+c+'">'+c+'</option>').join('');
  document.getElementById('setFrom').innerHTML = opts; document.getElementById('setTo').innerHTML = opts;
  document.getElementById('setFrom').value = currencyFrom();
  document.getElementById('setTo').value = currencyTo();
  document.getElementById('setHourly').value = hourlyRate();
  document.getElementById('setSalary').value = monthlySalary();
  document.getElementById('setDaily').value = dailyHours();
  document.getElementById('setOtMode').value = overtimeMode();
  document.getElementById('setOtMult').value = overtimeMult();
  document.getElementById('setExch').value = Number(s.exchange_rate) || 0;
  setSettingsMode(setFormMode); setSettingsConvert(setFormConvert); setSettingsOtVis(); syncCurLabels(); csSyncAll();
  const _ae=document.getElementById('acctEmail'); if (_ae) _ae.textContent = (DATA && DATA.email) ? ('👤 ' + DATA.email) : '—';
  switchSetTab('income');
  document.getElementById('setOverlay').classList.add('open');
}
function setSettingsMode(m) {
  setFormMode = m;
  document.getElementById('setModeHourly').className = 'type-btn'+(m==='hourly'?' set':'');
  document.getElementById('setModeSalaried').className = 'type-btn'+(m==='salaried'?' set':'');
  document.getElementById('setHourlyRow').style.display = m==='hourly'?'block':'none';
  document.getElementById('setSalaryRow').style.display = m==='salaried'?'block':'none';
}
function setSettingsConvert(on) {
  setFormConvert = !!on;
  document.getElementById('setConvOff').className = 'type-btn'+(!on?' set':'');
  document.getElementById('setConvOn').className = 'type-btn'+(on?' set':'');
  document.getElementById('setFromRow').style.display = on?'block':'none';
  document.getElementById('setExchRow').style.display = on?'block':'none';
  syncCurLabels();
}
function setSettingsOtVis() { document.getElementById('setOtMultRow').style.display = document.getElementById('setOtMode').value==='off'?'none':'block'; }
function syncCurLabels() {
  const to = document.getElementById('setTo').value, from = setFormConvert ? document.getElementById('setFrom').value : to;
  document.querySelectorAll('.cur-from-lbl').forEach(e=>e.textContent=from);
  document.getElementById('setExchLbl').textContent = t('set.exchUnit',{to:to,from:from});
}
function switchSetTab(t) {
  document.getElementById('setTabGeneral').classList.toggle('active', t==='income');
  document.getElementById('setTabCats').classList.toggle('active', t==='cats');
  document.getElementById('setTabThemes').classList.toggle('active', t==='themes');
  document.getElementById('setTabLang').classList.toggle('active', t==='lang');
  document.getElementById('setTabData').classList.toggle('active', t==='data');
  document.getElementById('setPaneGeneral').classList.toggle('active', t==='income');
  document.getElementById('setPaneCats').classList.toggle('active', t==='cats');
  document.getElementById('setPaneThemes').classList.toggle('active', t==='themes');
  document.getElementById('setPaneLang').classList.toggle('active', t==='lang');
  document.getElementById('setPaneData').classList.toggle('active', t==='data');
  if (t==='cats') renderCatList();
  if (t==='themes') renderThemePicker();
  if (t==='lang') renderLangPicker();
}
function renderCatList() {
  const el = document.getElementById('catList'); if (!el) return;
  const cats = (DATA && DATA.categories) || [];
  if (!cats.length) { el.innerHTML = '<div class="empty">'+t('empty.noCats')+'</div>'; return; }
  el.innerHTML = cats.map(c => {
    const editing = editingCatId===c.id;
    const nameCell = editing
      ? '<input id="catNameInput" class="cat-name-input" type="text" value="'+escAttr(c.name)+'" onclick="event.stopPropagation()" onblur="commitCatName(\''+c.id+'\',this.value)" onkeydown="if(event.key===\'Enter\'){this.blur();}else if(event.key===\'Escape\'){cancelCatName();}">'
      : '<span class="cat-name" onclick="editCatName(\''+c.id+'\')" title="Click to rename">'+esc(c.name)+'</span>';
    const tail = editing
      ? '<button class="cat-ok" onmousedown="event.preventDefault()" onclick="commitCatName(\''+c.id+'\', document.getElementById(\'catNameInput\').value)" title="Save">✓</button>'
      : '<button class="cat-del" onclick="deleteCat(\''+c.id+'\')" title="Delete">✕</button>';
    return '<div class="cat-row"><input type="color" class="cat-swatch" value="'+catColor(c.name)+'" onchange="changeCatColor(\''+c.id+'\',this.value)" title="Change colour">'
      + nameCell + tail + '</div>';
  }).join('');
}
function editCatName(id) { editingCatId = id; renderCatList(); setTimeout(()=>{ const i=document.getElementById('catNameInput'); if(i){ i.focus(); i.select(); } }, 30); }
function cancelCatName() { editingCatId = null; renderCatList(); }
function commitCatName(id, val) {
  if (editingCatId !== id) return;       // already cancelled (Escape)
  editingCatId = null;
  const c = ((DATA.categories)||[]).find(x=>x.id===id);
  const name = (val||'').trim();
  if (!c || !name || name===c.name) { renderCatList(); return; }
  if (((DATA.categories)||[]).some(x=>x.name===name)) { showToast(t('err.catExistsNamed',{name:name}), 'error'); renderCatList(); return; }
  jbRun('renameCategory', id, name)
    .then(()=>{ showToast(t('toast.catRenamed')); reload(); })
    .catch(e=>{ showToast(t('err.prefix')+e.message, 'error'); reload(); });
}
function addCat() {
  setFormError('catErr','');
  const inp = document.getElementById('newCatName'), name = inp.value.trim();
  if (!name) { setFormError('catErr',t('err.catName')); return; }
  if (((DATA.categories)||[]).some(c=>c.name===name)) { setFormError('catErr',t('err.catExists')); return; }
  inp.value = '';
  jbRun('addRecord', 'categories', { name, color:'' }).then(()=>{ showToast(t('toast.catAdded')); reload(); }).catch(e=>showToast(t('err.prefix')+e.message,'error'));
}
function changeCatColor(id, hex) {
  const c = ((DATA.categories)||[]).find(x=>x.id===id); if (!c) return;
  c.color = hex; rebuildCatColors(); renderAll();
  jbRun('updateRecord', 'categories', id, { name:c.name, color:hex }).catch(e=>{ showToast(t('err.prefix')+e.message,'error'); reload(); });
}
function deleteCat(id) {
  const c = ((DATA.categories)||[]).find(x=>x.id===id); if (!c) return;
  const txN = ((DATA.transactions)||[]).filter(t=>t.category===c.name).length;
  const blN = ((DATA.recurring)||[]).filter(b=>b.category===c.name).length;
  const used = txN+blN;
  const msg = used
    ? t('confirm.catUsed',{name:c.name,txN:txN,blN:blN})
    : t('confirm.catDelete',{name:c.name});
  showConfirm(t('confirm.catTitle'), msg, () => {
    jbRun('deleteRecord', 'categories', id).then(()=>{ showToast(t('toast.catDeleted')); reload(); }).catch(e=>showToast(t('err.prefix')+e.message, 'error'));
  });
}
function submitSettings() {
  setFormError('setErr','');
  const hourly=parseFloat(document.getElementById('setHourly').value)||0;
  const salary=parseFloat(document.getElementById('setSalary').value)||0;
  const daily=parseFloat(document.getElementById('setDaily').value);
  const otMode=document.getElementById('setOtMode').value;
  const otMult=parseFloat(document.getElementById('setOtMult').value)||1.5;
  const to=document.getElementById('setTo').value;
  const from=setFormConvert?document.getElementById('setFrom').value:to;
  const exch=setFormConvert?(parseFloat(document.getElementById('setExch').value)||0):1;
  if (!daily || daily<=0) { setFormError('setErr',t('err.stdHours')); return; }
  if (setFormMode==='hourly' && hourly<=0) { setFormError('setErr',t('err.hourlyRate')); return; }
  if (setFormMode==='salaried' && salary<=0) { setFormError('setErr',t('err.salary')); return; }
  if (setFormConvert && exch<=0) { setFormError('setErr',t('err.exchRate')); return; }
  const profile={ mode:setFormMode, hourly_rate:hourly, monthly_salary:salary, daily_hours:daily, overtime_mode:otMode, overtime_mult:otMult, convert_enabled:setFormConvert?'true':'false', currency_from:from, currency_to:to, exchange_rate:exch, profile_set:'true' };
  Object.assign(DATA.settings, profile);
  const btn=document.getElementById('setSave'); btn.disabled=true; btn.textContent=t('action.saving');
  jbRun('saveProfile', profile)
    .then(() => { btn.disabled=false; btn.textContent=t('set.saveIncome'); closeOverlay('setOverlay'); showToast(t('toast.incomeSaved')); renderAll(); })
    .catch(e => { btn.disabled=false; btn.textContent=t('set.saveIncome'); showToast(t('err.prefix')+e.message,'error'); });
}

/* ---------- Sheet-setup gate (Model B: per-user spreadsheet) ---------- */
function showSheetGate() {
  if (!DATA) DATA = { settings: { lang: lang() } };   // placeholder so t()/lang() work before a sheet exists
  applyStaticI18n();
  const ld = document.getElementById('loading'); if (ld) ld.style.display = 'none';
  renderGateLang();
  document.getElementById('sheetErr').textContent = '';
  document.getElementById('sheetOverlay').classList.add('open');
}
function renderGateLang() {
  const el = document.getElementById('gateLang'); if (!el) return; const cur = lang();
  el.innerHTML = [['ptBR','🇧🇷 Português'],['en','🇺🇸 English']].map(p =>
    '<button class="type-btn'+(cur===p[0]?' set':'')+'" onclick="gateSetLang(\''+p[0]+'\')">'+p[1]+'</button>').join('');
}
function gateSetLang(l) { if (!DATA.settings) DATA.settings = {}; DATA.settings.lang = l; applyStaticI18n(); renderGateLang(); }
function toggleSheetLink() { const p = document.getElementById('sheetLinkPanel'); p.style.display = (p.style.display==='none' || !p.style.display) ? 'block' : 'none'; }
function gateError(msg) { const e = document.getElementById('sheetErr'); e.textContent = msg; e.classList.add('show'); }
function createMySheet() {
  const btn = document.getElementById('sheetCreateBtn'); btn.disabled = true; btn.textContent = t('sheet.creating');
  gateError('');
  jbRun('createUserSheet')
    .then(onSheetReady)
    .catch(e => { btn.disabled = false; applyStaticI18n(); gateError(t('err.prefix') + e.message); });
}
function linkMySheet() {
  const url = document.getElementById('sheetLinkInput').value.trim();
  if (!url) { gateError(t('sheet.linkErr')); return; }
  const btn = document.getElementById('sheetLinkBtn'); btn.disabled = true; btn.textContent = t('sheet.linking');
  gateError('');
  jbRun('linkExistingSheet', url)
    .then(onSheetReady)
    .catch(e => { btn.disabled = false; applyStaticI18n(); gateError(t('sheet.linkErr')); });
}
function onSheetReady(data) {
  if (data && data.needsSetup) { gateError(t('sheet.linkErr')); document.getElementById('sheetCreateBtn').disabled=false; document.getElementById('sheetLinkBtn').disabled=false; applyStaticI18n(); return; }
  // carry the language chosen on the gate into the fresh sheet so the wizard opens in it
  const chosen = (DATA && DATA.settings && DATA.settings.lang) || 'ptBR';
  data.settings = data.settings || {};
  if (!data.settings.lang) data.settings.lang = chosen;
  document.getElementById('sheetOverlay').classList.remove('open');
  showToast(t('sheet.created'));
  boot(data);
}

/* ---------- First-run setup wizard ---------- */
let wizStep = 1;
const wiz = { lang:'ptBR', convert:false, from:'USD', to:'BRL', exch:0, mode:'hourly', hourly:0, salary:0, daily:8 };
function startWizard() {
  wiz.lang=lang(); wiz.from=currencyFrom(); wiz.to=currencyTo(); wiz.convert=convertEnabled();
  wiz.exch=Number(P().exchange_rate)||0; wiz.mode=mode(); wiz.hourly=hourlyRate(); wiz.salary=monthlySalary(); wiz.daily=dailyHours();
  wizStep=1; document.getElementById('wizOverlay').classList.add('open'); renderWizard();
}
function closeWizard() { document.getElementById('wizOverlay').classList.remove('open'); }
function curOptions(seld) { return Object.keys(CURRENCIES).map(c=>'<option value="'+c+'"'+(c===seld?' selected':'')+'>'+c+'</option>').join(''); }
function renderWizard() {
  document.getElementById('wizWelcome').textContent = wizStep===1 ? t('wizard.welcome') : '';
  document.getElementById('wizTitle').textContent = t('wizard.step'+wizStep+'Title');
  document.getElementById('wizSub').textContent = t('wizard.step'+wizStep+'Sub');
  for (let i=1;i<=3;i++) document.getElementById('wizDot'+i).classList.toggle('on', i===wizStep);
  const b = document.getElementById('wizBody');
  if (wizStep===1) {
    b.innerHTML = '<div class="lang-grid">' + [{id:'ptBR',flag:'🇧🇷'},{id:'en',flag:'🇺🇸'}].map(L0 =>
      '<button class="lang-card'+(wiz.lang===L0.id?' active':'')+'" onclick="wizSetLang(\''+L0.id+'\')"><span class="lang-flag">'+L0.flag+'</span><span class="lang-name">'+t('lang.'+L0.id)+'</span></button>').join('') + '</div>';
  } else if (wizStep===2) {
    let h = '<div class="wiz-fg"><label class="flabel">'+t('wizard.convertQ')+'</label><div class="type-row"><button class="type-btn'+(!wiz.convert?' set':'')+'" onclick="wizSetConvert(false)">'+t('set.singleCur')+'</button><button class="type-btn'+(wiz.convert?' set':'')+'" onclick="wizSetConvert(true)">'+t('set.convert')+'</button></div></div>';
    if (wiz.convert) h += '<div class="wiz-fg"><label class="flabel">'+t('set.paidIn')+'</label><select class="fselect" id="wizFrom">'+curOptions(wiz.from)+'</select></div>';
    h += '<div class="wiz-fg"><label class="flabel">'+t('set.trackIn')+'</label><select class="fselect" id="wizTo">'+curOptions(wiz.to)+'</select></div>';
    if (wiz.convert) h += '<div class="wiz-fg"><label class="flabel">'+t('set.exchRate')+'</label><input type="number" class="field" id="wizExch" step="0.0001" value="'+(wiz.exch||'')+'" placeholder="0,00"></div>';
    b.innerHTML = h;
  } else {
    let h = '<div class="wiz-fg"><label class="flabel">'+t('set.payModel')+'</label><div class="type-row"><button class="type-btn'+(wiz.mode==='hourly'?' set':'')+'" onclick="wizSetMode(\'hourly\')">'+t('set.hourly')+'</button><button class="type-btn'+(wiz.mode==='salaried'?' set':'')+'" onclick="wizSetMode(\'salaried\')">'+t('set.salaried')+'</button></div></div>';
    const unit = wiz.convert ? wiz.from : wiz.to;
    if (wiz.mode==='hourly') h += '<div class="wiz-fg"><label class="flabel">'+t('set.hourlyRate')+' ('+unit+')</label><input type="number" class="field" id="wizHourly" step="0.01" value="'+(wiz.hourly||'')+'" placeholder="0,00"></div>';
    else h += '<div class="wiz-fg"><label class="flabel">'+t('set.monthlySalary')+' ('+unit+')</label><input type="number" class="field" id="wizSalary" step="0.01" value="'+(wiz.salary||'')+'" placeholder="0,00"></div>';
    h += '<div class="wiz-fg"><label class="flabel">'+t('set.stdHours')+'</label><input type="number" class="field" id="wizDaily" step="0.5" min="0" value="'+(wiz.daily||8)+'"></div>';
    b.innerHTML = h;
  }
  document.getElementById('wizFoot').innerHTML =
    (wizStep>1 ? '<button class="wiz-back" onclick="wizBack()">'+t('wizard.back')+'</button>' : '')
    + '<button class="btn-primary" onclick="wizNext()">'+(wizStep<3 ? t('wizard.next') : t('wizard.finish'))+'</button>';
  document.getElementById('wizSkip').textContent = t('wizard.skip');
  document.querySelectorAll('#wizBody select').forEach(enhanceSelect);
}
function captureStep() {
  if (wizStep===2) { const f=document.getElementById('wizFrom'), to=document.getElementById('wizTo'), e=document.getElementById('wizExch');
    if (f) wiz.from=f.value; if (to) wiz.to=to.value; if (e) wiz.exch=parseFloat(e.value)||0; }
  if (wizStep===3) { const h=document.getElementById('wizHourly'), sal=document.getElementById('wizSalary'), d=document.getElementById('wizDaily');
    if (h) wiz.hourly=parseFloat(h.value)||0; if (sal) wiz.salary=parseFloat(sal.value)||0; if (d) wiz.daily=parseFloat(d.value)||0; }
}
function wizSetLang(l) { wiz.lang=l; if(!DATA.settings)DATA.settings={}; DATA.settings.lang=l; applyStaticI18n(); jbSaveSetting('lang', l); renderWizard(); }
function wizSetConvert(v) { captureStep(); wiz.convert=!!v; renderWizard(); }
function wizSetMode(m) { captureStep(); wiz.mode=m; renderWizard(); }
function wizBack() { captureStep(); if (wizStep>1) { wizStep--; renderWizard(); } }
function wizNext() {
  captureStep();
  if (wizStep===2 && wiz.convert && (!wiz.from || wiz.exch<=0)) { showToast(t('err.exchRate'),'error'); return; }
  if (wizStep===3) {
    if (!wiz.daily || wiz.daily<=0) { showToast(t('err.stdHours'),'error'); return; }
    if (wiz.mode==='hourly' && wiz.hourly<=0) { showToast(t('err.hourlyRate'),'error'); return; }
    if (wiz.mode==='salaried' && wiz.salary<=0) { showToast(t('err.salary'),'error'); return; }
    finishWizard(); return;
  }
  wizStep++; renderWizard();
}
function finishWizard() {
  const profile = { mode:wiz.mode, hourly_rate:wiz.hourly, monthly_salary:wiz.salary, daily_hours:wiz.daily,
    overtime_mode:overtimeMode(), overtime_mult:overtimeMult(),
    convert_enabled:wiz.convert?'true':'false', currency_from:wiz.convert?wiz.from:wiz.to, currency_to:wiz.to,
    exchange_rate:wiz.convert?wiz.exch:1, profile_set:'true', lang:wiz.lang };
  Object.assign(DATA.settings, profile);
  jbRun('saveProfile', profile).catch(e=>showToast(t('err.prefix')+e.message,'error'));
  closeWizard(); applyStaticI18n(); renderAll(); showToast(t('wizard.done'));
  if (wiz.mode==='salaried' && Number(wiz.salary)>0) { promptApplySalary(Number(wiz.salary)); }
  else if (!tourIsDone()) setTimeout(startTour, 450);
}
function skipWizard() { if(!DATA.settings)DATA.settings={}; DATA.settings.profile_set='true'; jbSaveSetting('profile_set','true'); closeWizard(); }

/* ---------- All-settled badge ---------- */
function allSettled() {
  const bills = activeBills(), allocs = activeAllocations();
  if (!bills.length && !allocs.length) return false;
  return bills.every(b=>isPaidBill(b.id)) && allocs.every(a=>isPaid('allocation', a.id));
}
function renderSettledBadge() {
  const el = document.getElementById('settledBadge'); if (!el) return;
  if (allSettled()) { el.textContent = t('settled.badge'); el.style.display = ''; } else el.style.display = 'none';
}

/* ---------- Backup export ---------- */
function exportBackup_() {
  const btn = document.getElementById('exportBtn'), link = document.getElementById('exportLink');
  btn.disabled = true; btn.textContent = t('export.working'); link.style.display = 'none';
  jbRun('exportBackup')
    .then(r => { btn.disabled = false; applyStaticI18n(); link.href = r.url; link.textContent = t('export.open'); link.style.display = 'inline-block'; showToast(t('export.done')); })
    .catch(e => { btn.disabled = false; applyStaticI18n(); showToast(t('err.prefix') + e.message, 'error'); });
}

/* ---------- Guided tour (core JB.tour) ---------- */
var FIN_TOUR=[
  { title:'Bem-vindo ao Finance 💰', body:'Um tour rápido pelas principais funções.' },
  { go:function(){ switchTab('overview'); }, sel:'.summary-grid', title:'Visão geral', body:'Receitas, despesas, saldo e taxa de poupança do mês — tudo no topo.' },
  { go:function(){ switchTab('worklog'); }, sel:'.cal-grid', title:'Jornada', body:'Marque os dias que trabalhou; o app estima sua renda e você a lança no mês.' },
  { go:function(){ switchTab('money'); }, sel:'#tab-money .card', title:'Dinheiro', body:'Lance transações, veja o histórico e busque por descrição.' },
  { go:function(){ switchTab('bills'); }, sel:'#tab-bills', title:'Contas & Poupança', body:'Contas recorrentes, poupança e metas — tudo num lugar só.' },
  { go:function(){ switchTab('budget'); }, sel:'#tab-budget .card', title:'Orçamento', body:'Defina limites por categoria e acompanhe os gastos do mês.' },
  { go:function(){ switchTab('overview'); }, sel:'#fab', title:'Adicionar', body:'Toque no + para lançar uma transação rapidamente.' },
  { sel:'#settingsBtn', title:'Ajustes', body:'Temas, idioma, backup e este tutorial ficam aqui. ✨' }
];
function tourIsDone(){ return JB.tourDone('finance'); }
function startTour(){ JB.tour('finance', FIN_TOUR); }
function replayTour(){ closeOverlay('setOverlay'); setTimeout(startTour, 250); }

/* ---------- Savings: overall balance = editable base + ticked general contributions ---------- */
function generalSaved() {
  let extra = 0;
  (DATA.allocations||[]).filter(a=>a.goalId==='__general__').forEach(a => { extra += allocationPaidSum(a); });
  return extra;
}
function savingsTotal() { return (Number(P().savings_balance)||0) + generalSaved(); }
function renderSavingsBalance() {
  const total = brl(savingsTotal());
  ['savingsValue','savingsValueOv'].forEach(id => { const el=document.getElementById(id); if (el) el.textContent = total; });
  const rw=document.getElementById('savingsRunwayOv'); if (rw) { const r=runwayMonths(); rw.textContent = r!=null ? t('runway.label',{n:(Math.round(r*10)/10)}) : ''; }
}
function editSavingsBalance() {
  const cell=document.getElementById('savingsValue'); if (!cell) return;
  const v = savingsTotal();
  cell.innerHTML='<input id="sbInput" class="sb-input" type="number" step="0.01" value="'+v+'" onclick="event.stopPropagation()" onblur="commitSavingsBalance(this.value)" onkeydown="if(event.key===\'Enter\'){this.blur();}else if(event.key===\'Escape\'){renderSavingsBalance();}">';
  const inp=document.getElementById('sbInput'); if (inp) { inp.focus(); inp.select(); }
}
function commitSavingsBalance(val) {
  const n=parseFloat(val); if (isNaN(n)) { renderSavingsBalance(); return; }
  const base = n - generalSaved();   // entered value is the TOTAL; store base so total === entered
  if (!DATA.settings) DATA.settings={}; DATA.settings.savings_balance=base;
  jbRun('saveSetting', 'savings_balance', base).catch(e=>showToast(t('err.prefix')+e.message,'error'));
  renderSavingsBalance(); showToast(t('savings.saved'));
}
function renderGeneralSavings() {
  const el=document.getElementById('genSavingsList'); if (!el) return;
  const mine = activeAllocations().filter(a=>a.goalId==='__general__');
  if (!mine.length) { el.innerHTML = '<div class="empty">'+t('savings.empty')+'</div>'; return; }
  el.innerHTML = mine.map(a => renderAllocRowHtml(a)).join('');
}
function applyAllocOverride(id, month, amount) {
  let p = (DATA.payments||[]).find(x => x.month===month && x.type==='allocation' && String(x.itemId)===String(id));
  if (p) p.actualAmount = Number(amount);
  else (DATA.payments=DATA.payments||[]).push({ month:month, type:'allocation', itemId:String(id), paid:false, actualAmount:Number(amount), paidDate:'' });
  jbRun('setAllocOverride', month, id, amount).catch(e => { showToast(t('err.prefix')+e.message,'error'); reload(); });
}
function skipAllocMonth(id) {
  const cur = curYM();
  (DATA.payments=DATA.payments||[]).push({ month:cur, type:'skip', itemId:String(id), paid:true, actualAmount:null, paidDate:'' });
  renderAll(); showToast(t('toast.allocSkipped'));
  jbRun('setBillSkip', cur, id).catch(e => { showToast(t('err.prefix')+e.message,'error'); reload(); });
}
function promptAllocAmount(id) {
  const a = (DATA.allocations||[]).find(x=>x.id===id); if (!a) return;
  const active = activeAllocations().find(x=>x.id===id);
  const curAmt = active ? active.amount : a.amount;
  confirmCtx = { kind:'allocAmt', id:id, month:curYM(), nominal:a.amount };
  document.getElementById('ccTitle').textContent = goalName(a.goalId);
  document.getElementById('ccQ').innerHTML = t('alloc.amtPrompt',{amt:brl(a.amount)});
  document.getElementById('ccYesNo').style.display = 'none';
  document.getElementById('ccDateRow').style.display = 'none';
  document.getElementById('ccInputWrap').style.display = 'flex';
  document.getElementById('ccInput').value = curAmt;
  document.getElementById('confirmCard').classList.add('show');
  setTimeout(()=>{ const i=document.getElementById('ccInput'); if(i){ i.focus(); i.select(); } }, 20);
}
function openGeneralAllocation() { openAllocation('__general__'); }
let svDir='deposit';
function openSavingsMove(dir) {
  svDir = (dir==='withdraw') ? 'withdraw' : 'deposit';
  document.getElementById('svTitle').textContent = svDir==='withdraw' ? t('savings.withdrawTitle') : t('savings.depositTitle');
  setFormError('svErr',''); document.getElementById('svAmt').value=''; syncCurSyms();
  document.getElementById('svOverlay').classList.add('open');
  setTimeout(()=>{ const i=document.getElementById('svAmt'); if (i) i.focus(); }, 30);
}
function submitSavingsMove() {
  setFormError('svErr','');
  const amt = parseAmount(document.getElementById('svAmt').value);
  if (!amt || amt<=0) { setFormError('svErr', t('err.amount')); return; }
  const base = Number(P().savings_balance)||0;
  const newBase = svDir==='withdraw' ? base-amt : base+amt;
  const date = isCurrentMonth() ? todayStr() : (ymStr(selY,selM)+'-01');
  const tx = svDir==='withdraw'
    ? { date, description:t('savings.withdrawDesc'), category:t('cat.savings'), amount:amt, type:'Income' }
    : { date, description:t('savings.depositDesc'), category:t('cat.savings'), amount:amt, type:'Expense' };
  const btn=document.getElementById('svSave'); btn.disabled=true; btn.textContent=t('action.saving');
  if (!DATA.settings) DATA.settings={}; DATA.settings.savings_balance=newBase;
  jbRun('savingsMove', newBase, tx)
    .then(()=>{ btn.disabled=false; btn.textContent=t('action.confirm'); closeOverlay('svOverlay'); showToast(svDir==='withdraw'?t('savings.withdrew'):t('savings.deposited')); reload(); })
    .catch(e=>{ btn.disabled=false; btn.textContent=t('action.confirm'); showToast(t('err.prefix')+e.message,'error'); });
}

/* ---------- Recurring-salary controls (Work Log) ---------- */
function renderSalaryControl() {
  const el=document.getElementById('salaryCtl'); if (!el) return;
  if (salaryActiveIn(selY,selM)) {
    el.innerHTML='<div class="salary-status">'+t('salary.recurring',{amt:brl(salaryAmt())})+'</div>'
      + '<button class="salary-btn danger" onclick="removeRecurringSalary()">'+t('salary.remove')+'</button>';
  } else {
    const amt=computeIncome().total;
    el.innerHTML='<button class="salary-btn" onclick="addRecurringSalary()">'+t('salary.add')+'</button>'
      + '<div class="salary-status">'+(amt>0 ? t('salary.addHint',{amt:brl(amt)}) : t('salary.none'))+'</div>';
  }
}
function addRecurringSalary() {
  const amt=computeIncome().total;
  if (!amt) { showToast(t('salary.none'),'error'); return; }
  const start='m'+curYM();
  if (!DATA.settings) DATA.settings={};
  DATA.settings.salary_amount=amt; DATA.settings.salary_start=start; DATA.settings.salary_end='';
  jbRun('saveProfile', { salary_amount:amt, salary_start:start, salary_end:'' }).catch(e=>showToast(t('err.prefix')+e.message,'error'));
  renderAll(); showToast(t('salary.added'));
}
function removeRecurringSalary() {
  const end='m'+ymAdd(curYM(),-1);
  if (!DATA.settings) DATA.settings={};
  DATA.settings.salary_end=end;
  jbRun('saveSetting', 'salary_end', end).catch(e=>showToast(t('err.prefix')+e.message,'error'));
  renderAll(); showToast(t('salary.removed'));
}

/* ---------- In-app feedback (emails the app owner) ---------- */
let fbKind='bug';
function openFeedback(kind) {
  setFbKind(kind||'bug'); setFormError('fbErr',''); document.getElementById('fbMsg').value=''; document.getElementById('fbName').value='';
  document.getElementById('fbOverlay').classList.add('open');
  setTimeout(()=>{ const m=document.getElementById('fbMsg'); if (m) m.focus(); }, 30);
}
function setFbKind(k) {
  fbKind=(k==='feature')?'feature':'bug';
  document.getElementById('fbBug').className='type-btn'+(fbKind==='bug'?' set':'');
  document.getElementById('fbFeat').className='type-btn'+(fbKind==='feature'?' set':'');
  document.getElementById('fbTitle').textContent = fbKind==='feature' ? t('fb.titleFeature') : t('fb.titleBug');
}
function submitFeedback() {
  setFormError('fbErr','');
  const msg=document.getElementById('fbMsg').value.trim();
  if (!msg) { setFormError('fbErr', t('fb.empty')); return; }
  if (FEEDBACK_FORM.action.indexOf('FORM_ID') > -1) { setFormError('fbErr', 'Feedback form not set up yet.'); return; }
  const btn=document.getElementById('fbSave'); btn.disabled=true; btn.textContent=t('action.saving');
  const fd=new FormData();
  fd.append(FEEDBACK_FORM.nameEntry, document.getElementById('fbName').value.trim());
  fd.append(FEEDBACK_FORM.kindEntry, fbKind==='feature' ? 'Feature request' : 'Bug report');
  fd.append(FEEDBACK_FORM.msgEntry, msg);
  const done=()=>{ btn.disabled=false; btn.textContent=t('fb.send'); closeOverlay('fbOverlay'); showToast(t('fb.sent')); };
  fetch(FEEDBACK_FORM.action, { method:'POST', mode:'no-cors', body: fd }).then(done, done);
}

function renderTrend() {
  const el=document.getElementById('trendChart'); if (!el) return;
  const cols=[]; for(let k=5;k>=0;k--){ const d=new Date(now.getFullYear(), now.getMonth()-k, 1); cols.push({y:d.getFullYear(), m:d.getMonth(), label:d.toLocaleString(L(),{month:'short'}), val:monthExpense(d.getFullYear(), d.getMonth())}); }
  const max=Math.max(1, ...cols.map(c=>c.val));
  el.innerHTML='<div class="trend-bars">'+cols.map(c=>{ const h=Math.max(3,Math.round(c.val/max*100)); const cur=(c.y===now.getFullYear()&&c.m===now.getMonth()); return '<div class="trend-col"><div class="trend-bar-wrap"><div class="trend-bar'+(cur?' cur':'')+'" style="height:'+h+'%" title="'+brl(c.val)+'"></div></div><div class="trend-lbl">'+c.label+'</div><div class="trend-val">'+brl(c.val)+'</div></div>'; }).join('')+'</div>';
}
function openRecap() {
  const inc=incomeFor(selY,selM), exp=monthExpense(selY,selM), saved=inc-exp, rate=inc>0?Math.round(saved/inc*100):0;
  document.getElementById('recapTitle').textContent = new Date(selY,selM,1).toLocaleString(L(),{month:'long',year:'numeric'});
  const data=spentVsProjectedByCat();
  const cats=Object.keys(data).map(k=>({cat:k, v:(data[k].spent||0)})).filter(c=>c.v>0.005).sort((a,b)=>b.v-a.v).slice(0,3);
  let h='';
  h+='<div class="recap-row"><span class="rk">'+t('sum.income')+'</span><span class="rv" style="color:var(--income)">'+brl(inc)+'</span></div>';
  h+='<div class="recap-row"><span class="rk">'+t('sum.expenses')+'</span><span class="rv" style="color:var(--expense)">'+brl(exp)+'</span></div>';
  h+='<div class="recap-row"><span class="rk">'+t('recap.saved')+'</span><span class="rv" style="color:'+(saved<0?'var(--expense)':'var(--income)')+'">'+(saved<0?'−':'')+brl(saved)+'</span></div>';
  h+='<div class="recap-row"><span class="rk">'+t('sum.savingsRate')+'</span><span class="rv">'+rate+'%</span></div>';
  h+='<div class="recap-sub">'+t('recap.top')+'</div>';
  h+= cats.length ? cats.map(c=>'<div class="recap-cat"><span>'+c.cat+'</span><span>'+brl(c.v)+'</span></div>').join('') : '<div class="recap-cat"><span>'+t('recap.none')+'</span><span></span></div>';
  document.getElementById('recapBody').innerHTML=h;
  document.getElementById('recapOverlay').classList.add('open');
}
function openImport() {
  closeOverlay('setOverlay'); setFormError('impErr',''); document.getElementById('impText').value='';
  document.getElementById('impOverlay').classList.add('open');
  setTimeout(()=>{ const i=document.getElementById('impText'); if (i) i.focus(); }, 30);
}
function submitImport() {
  setFormError('impErr','');
  const raw=document.getElementById('impText').value.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const rows=[];
  raw.forEach(line => {
    const delim = line.indexOf('\t')>-1 ? '\t' : (line.indexOf(';')>-1 ? ';' : ',');
    const p=line.split(delim).map(x=>x.trim());
    const date=p[0]||'', desc=p[1]||'', amt=parseAmount(p[2]||''), cat=p[3]||'', typ=p[4]||'';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(amt) || amt<=0) return;
    const type=/^(income|receita|renda)$/i.test(typ) ? 'Income' : 'Expense';
    rows.push({ date, description: desc||'—', category: cat, amount: amt, type });
  });
  if (!rows.length) { setFormError('impErr', t('imp.none')); return; }
  const btn=document.getElementById('impBtn'); btn.disabled=true; btn.textContent=t('imp.importing');
  jbRun('importTransactions', rows)
    .then(r=>{ btn.disabled=false; btn.textContent=t('imp.btn'); closeOverlay('impOverlay'); showToast(t('imp.done',{n:(r&&r.count)||rows.length})); reload(); })
    .catch(e=>{ btn.disabled=false; btn.textContent=t('imp.btn'); showToast(t('err.prefix')+e.message,'error'); });
}
let billScopeCtx = null;

function openBillScope(mode, extra) {
  billScopeCtx = Object.assign({ mode: mode }, extra || {});
  const titleEl = document.getElementById('billDelTitle');
  if (titleEl) titleEl.textContent = mode === 'amount' ? t('billamt.title') : t('billdel.title');
  const allBtn = document.getElementById('billScopeAllBtn');
  if (allBtn) {
    allBtn.textContent = t('billdel.all');
    allBtn.className = mode === 'delete' ? 'btn-primary danger' : 'btn-primary alt';
  }
  document.getElementById('billDelOverlay').classList.add('open');
}

function billScopeThisMonth() {
  if (!billScopeCtx) return;
  if (billScopeCtx.mode === 'delete') delBillThisMonth();
  else applyBillAmtThisMonth();
}
function billScopeOnwards() {
  if (!billScopeCtx) return;
  if (billScopeCtx.mode === 'delete') delBillOnwards();
  else applyBillAmtOnwards();
}
function billScopeAll() {
  if (!billScopeCtx) return;
  if (billScopeCtx.mode === 'delete') delBillAll();
  else applyBillAmtAll();
}

function applyBillOverride(id, month, amount) {
  const fam = ['bill','recurring','installment'];
  let p = (DATA.payments||[]).find(x => x.month===month && fam.indexOf(x.type)>-1 && String(x.itemId)===String(id));
  if (p) p.actualAmount = Number(amount);
  else (DATA.payments=DATA.payments||[]).push({ month:month, type:'bill', itemId:String(id), paid:false, actualAmount:Number(amount), paidDate:'' });
  jbRun('setBillOverride', month, id, amount).catch(e => { showToast(t('err.prefix')+e.message,'error'); reload(); });
}

function splitBillAtCurrent(id, cur) {
  const i = (DATA.recurring||[]).findIndex(x => String(x.id)===String(id));
  if (i < 0) return { status:'gone' };
  const plan = FinMath.planBillSplit(DATA.recurring[i], cur);
  if (plan.status === 'deleted') {
    const prev = DATA.recurring[i];
    DATA.recurring.splice(i, 1);
    return { status:'deleted', prev: prev };
  }
  if (plan.status === 'truncated') {
    DATA.recurring[i].installments = plan.bill.installments;
    return { status:'truncated', bill: DATA.recurring[i] };
  }
  return plan;
}

function applyBillAmtThisMonth() {
  const data = billScopeCtx.formData, id = editing.id, cur = curYM();
  const b = (DATA.recurring||[]).find(x => String(x.id)===String(id));
  billScopeCtx = null;
  closeOverlay('billDelOverlay');
  closeOverlay('billOverlay');
  editing = {type:null,id:null};
  if (!b || !data) return;
  const patch = { name:data.name, dueDay:data.dueDay, category:data.category, installments:data.installments, startMonth:data.startMonth, amount:b.amount };
  Object.assign(b, patch);
  applyBillOverride(id, cur, data.amount);
  renderAll();
  showToast(t('toast.billAmtMonth'));
  jbRun('updateRecord', 'recurring', id, patch).catch(e => { showToast(t('err.prefix')+e.message,'error'); reload(); });
}

function applyBillAmtOnwards() {
  const data = billScopeCtx.formData, id = editing.id, cur = curYM();
  const b = (DATA.recurring||[]).find(x => String(x.id)===String(id));
  billScopeCtx = null;
  closeOverlay('billDelOverlay');
  closeOverlay('billOverlay');
  editing = {type:null,id:null};
  if (!b || !data) return;
  const start = b.startMonth || cur;
  const elapsed = monthDiff(start, cur);
  const hadFinite = b.installments > 0;
  const remain = hadFinite ? Math.max(0, b.installments - elapsed) : 0;
  const split = splitBillAtCurrent(id, cur);
  const fail = e => { showToast(t('err.prefix')+e.message,'error'); reload(); };
  if (split.status === 'deleted') {
    jbRun('deleteRecord', 'recurring', id).catch(fail);
    if (hadFinite && remain <= 0) { renderAll(); showToast(t('toast.billStopped')); return; }
  } else if (split.bill) {
    const sb = split.bill;
    jbRun('updateRecord', 'recurring', id, { name:sb.name, amount:sb.amount, dueDay:sb.dueDay, category:sb.category, installments:sb.installments, startMonth:sb.startMonth }).catch(fail);
  }
  if (hadFinite && remain <= 0) { renderAll(); showToast(t('toast.billStopped')); return; }
  const newBill = { name:data.name, amount:data.amount, dueDay:data.dueDay, category:data.category, startMonth:cur, installments:hadFinite ? remain : 0 };
  jbRun('addRecord', 'recurring', newBill).then(res => {
    (DATA.recurring=DATA.recurring||[]).push(Object.assign({}, newBill, { id:(res&&res.id) }));
    renderAll();
    showToast(t('toast.billAmtOnwards'));
  }).catch(fail);
}

function applyBillAmtAll() {
  const data = billScopeCtx.formData;
  billScopeCtx = null;
  closeOverlay('billDelOverlay');
  saveRecord('recurring', data, document.getElementById('billSave'), t('bill.update'), 'billOverlay');
}

function deleteBillScoped() { if (!editing.id) return; const b=(DATA.recurring||[]).find(x=>String(x.id)===String(editing.id)); if (b && b.installments===1) { delBillAll(); return; } openBillScope('delete'); }
function delBillAll() {
  const id=editing.id, rec=(DATA.recurring||[]).find(x=>String(x.id)===String(id));
  billScopeCtx=null; closeOverlay('billDelOverlay'); closeAllOverlays(); editing={type:null,id:null};
  const i=(DATA.recurring||[]).findIndex(x=>String(x.id)===String(id)); if (i>-1) DATA.recurring.splice(i,1);
  renderAll();
  showToast(t('toast.deleted'), null, rec ? function(){ undoDelete('recurring', rec); } : null);
  jbRun('deleteRecord', 'recurring', id).catch(e=>{ showToast(t('err.prefix')+e.message,'error'); reload(); });
}
function delBillOnwards() {
  const id=editing.id, cur=curYM();
  billScopeCtx=null; closeOverlay('billDelOverlay'); closeAllOverlays(); editing={type:null,id:null};
  const split = splitBillAtCurrent(id, cur);
  if (split.status === 'deleted') {
    renderAll(); showToast(t('toast.deleted'));
    jbRun('deleteRecord', 'recurring', id).catch(e=>{ showToast(t('err.prefix')+e.message,'error'); reload(); });
    return;
  }
  renderAll(); showToast(t('toast.billStopped'));
  const b = split.bill;
  jbRun('updateRecord', 'recurring', id, { name:b.name, amount:b.amount, dueDay:b.dueDay, category:b.category, installments:b.installments, startMonth:b.startMonth }).catch(e=>{ showToast(t('err.prefix')+e.message,'error'); reload(); });
}
function delBillThisMonth() {
  const id=editing.id, cur=curYM();
  billScopeCtx=null; closeOverlay('billDelOverlay'); closeAllOverlays(); editing={type:null,id:null};
  (DATA.payments=DATA.payments||[]).push({ month:cur, type:'skip', itemId:String(id), paid:true, actualAmount:null, paidDate:'' });
  renderAll(); showToast(t('toast.billSkipped'));
  jbRun('setBillSkip', cur, id).catch(e=>{ showToast(t('err.prefix')+e.message,'error'); reload(); });
}
/* ---------- Easter egg: 5 taps on the copyright ---------- */
let eggClicks=0, eggTimer=null;
function eggTap() {
  eggClicks++;
  clearTimeout(eggTimer);
  eggTimer=setTimeout(function(){ eggClicks=0; }, 1200);
  if (eggClicks>=5) { eggClicks=0; clearTimeout(eggTimer); triggerEgg(); }
}
function triggerEgg() {
  const ov=document.getElementById('eggOverlay'); if (ov) ov.classList.add('show');
  const app=document.getElementById('app'); if (app) { app.classList.add('egg-shake'); setTimeout(function(){ app.classList.remove('egg-shake'); }, 650); }
  confettiBurst();
  setTimeout(closeEgg, 4500);
}
function closeEgg() { const ov=document.getElementById('eggOverlay'); if (ov) ov.classList.remove('show'); }
function confettiBurst() {
  const colors=['#ec4899','#f9a8d4','#a78bfa','#34d399','#fbbf24','#60a5fa'];
  for (let i=0;i<100;i++) {
    const p=document.createElement('div'); p.className='confetti-pc';
    const sz=6+Math.random()*9;
    p.style.left=(Math.random()*100)+'vw'; p.style.width=sz+'px'; p.style.height=(sz*0.6)+'px';
    p.style.background=colors[Math.floor(Math.random()*colors.length)];
    const dur=2.2+Math.random()*1.9;
    p.style.animation='confetti-fall '+dur+'s linear '+(Math.random()*0.5)+'s forwards';
    document.body.appendChild(p);
    (function(el,ms){ setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, ms); })(p, (dur+1)*1000);
  }
}
function showToast(msg, type, undoFn) {
  const el=document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg||window.t('toast.saved');
  el.classList.toggle('error', type==='error');
  const ub=document.getElementById('toastUndo');
  if (undoFn) { ub.style.display=''; ub.textContent=window.t('toast.undo'); ub.onclick=function(){ el.classList.remove('show'); clearTimeout(el._timer); undoFn(); }; }
  else { ub.style.display='none'; ub.onclick=null; }
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(function(){ el.classList.remove('show'); }, type==='error'?4000:(undoFn?6000:3000));
}
/* ===================== Bill split — rachar conta ===================== */
let splitState = null;
function splUid(){ return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function fmtMoney(n){ const c = CURRENCIES[currencyTo()] || { symbol:'', locale:'en-US' }; return (c.symbol ? c.symbol+' ' : '') + (Math.abs(Number(n)||0)).toLocaleString(c.locale, { minimumFractionDigits:2, maximumFractionDigits:2 }); }
function fmtUnit(n){ n = Number(n)||0; return (Math.abs(n % 1) < 1e-9) ? String(Math.round(n)) : n.toLocaleString(L(), { maximumFractionDigits:2 }); }
function setItemMode(id, mode){
  const it = splitState.items.find(i => i.id === id); if (!it || it.priceMode === mode) return;
  const total = itemTotal(it), q = Number(it.qty)||0;
  it.price = round2(mode === 'unit' ? (q > 0 ? total/q : 0) : total);
  it.priceMode = mode;
  renderSplitItems(); renderSplitTotals();
}

function openSplit(){
  try {
    closeFab();
    splitState = { people:[{ id:splUid(), name:t('split.me'), isMe:true }], items:[] };
    document.getElementById('spTitle').value = '';
    document.getElementById('spSvc').checked = false;
    document.getElementById('spSvcPct').value = '10';
    document.getElementById('spPersonName').value = '';
    setFormError('splitErr','');
    addItem();
    renderSplitPeople(); renderSplitItems(); renderSplitTotals();
    document.getElementById('splitOverlay').classList.add('open');
  } catch (e) {
    try { showToast('Rachar: ' + (e && e.message ? e.message : e), 'error'); } catch (_) { alert('Rachar: ' + (e && e.message ? e.message : e)); }
  }
}
function addPerson(){
  const inp = document.getElementById('spPersonName'); const name = (inp.value||'').trim();
  if (!name) return;
  splitState.people.push({ id:splUid(), name:name, isMe:false });
  inp.value = ''; inp.focus();
  renderSplitPeople(); renderSplitItems(); renderSplitTotals();
}
function removePerson(id){
  splitState.people = splitState.people.filter(p => p.id !== id);
  splitState.items.forEach(it => { delete it.assign[id]; });
  if (!splitState.people.some(p => p.isMe) && splitState.people[0]) splitState.people[0].isMe = true;
  renderSplitPeople(); renderSplitItems(); renderSplitTotals();
}
function setMe(id){ splitState.people.forEach(p => p.isMe = (p.id === id)); renderSplitPeople(); renderSplitTotals(); }
function renderSplitPeople(){
  const el = document.getElementById('spPeople');
  el.innerHTML = splitState.people.map(p =>
    '<span class="sp-chip'+(p.isMe?' me':'')+'" onclick="setMe(\''+p.id+'\')">'
    + (p.isMe ? '<span class="star">★</span>' : '')
    + '<span>'+esc(p.name)+'</span>'
    + '<span class="sp-chip-x" onclick="event.stopPropagation();removePerson(\''+p.id+'\')">✕</span>'
    + '</span>'
  ).join('');
}
function addItem(){ splitState.items.push({ id:splUid(), name:'', qty:1, price:0, priceMode:'total', assign:{} }); renderSplitItems(); renderSplitTotals(); }
function removeItem(id){ splitState.items = splitState.items.filter(i => i.id !== id); renderSplitItems(); renderSplitTotals(); }
function setItemField(id, field, val){
  const it = splitState.items.find(i => i.id === id); if (!it) return;
  if (field === 'name') it.name = val;
  else if (field === 'qty') it.qty = Math.max(0, parseFloat(String(val).replace(',','.')) || 0);
  else if (field === 'price') it.price = Math.max(0, parseAmount(val) || 0);
  renderSplitItems(); renderSplitTotals();
}
function assignUnit(itemId, personId, delta){
  const it = splitState.items.find(i => i.id === itemId); if (!it) return;
  let next = (Number(it.assign[personId]) || 0) + delta;
  if (next < 0) next = 0;
  if (Math.abs(next) < 1e-9) delete it.assign[personId]; else it.assign[personId] = next;
  renderSplitItems(); renderSplitTotals();
}
function splitEqual(itemId){
  const it = splitState.items.find(i => i.id === itemId); if (!it) return;
  const n = splitState.people.length; if (!n) return;
  it.assign = {}; const each = (Number(it.qty)||0) / n;
  splitState.people.forEach(p => it.assign[p.id] = each);
  renderSplitItems(); renderSplitTotals();
}
function allMine(itemId){
  const it = splitState.items.find(i => i.id === itemId); if (!it) return;
  const me = splitState.people.find(p => p.isMe) || splitState.people[0]; if (!me) return;
  it.assign = {}; it.assign[me.id] = Number(it.qty) || 0;
  renderSplitItems(); renderSplitTotals();
}
function renderSplitItems(){
  const el = document.getElementById('spItems');
  el.innerHTML = splitState.items.map(function(it){
    const total = itemTotal(it);
    const unit = it.qty > 0 ? total / it.qty : 0;
    const assigned = sumAssign(it);
    const over = assigned > it.qty + 1e-9;
    const ppl = splitState.people.map(function(p){
      const c = it.assign[p.id] || 0;
      return '<span class="sp-ap">'
        + '<button class="sp-step-btn" onclick="assignUnit(\''+it.id+'\',\''+p.id+'\',-1)">−</button>'
        + '<span class="ap-count">'+fmtUnit(c)+'</span>'
        + '<button class="sp-step-btn" onclick="assignUnit(\''+it.id+'\',\''+p.id+'\',1)">+</button>'
        + '<span class="ap-name">'+esc(p.name)+'</span>'
        + '</span>';
    }).join('');
    return '<div class="sp-item">'
      + '<div class="sp-item-head">'
        + '<input class="field si-name" placeholder="'+escAttr(t('split.itemName'))+'" value="'+escAttr(it.name)+'" onchange="setItemField(\''+it.id+'\',\'name\',this.value)">'
        + '<input class="field si-qty" type="number" min="0" step="1" placeholder="'+escAttr(t('split.qty'))+'" value="'+(it.qty||'')+'" onchange="setItemField(\''+it.id+'\',\'qty\',this.value)">'
        + '<input class="field si-total" inputmode="decimal" placeholder="'+escAttr(t(it.priceMode==='unit'?'split.eachPh':'split.totalPh'))+'" value="'+(it.price||'')+'" onchange="setItemField(\''+it.id+'\',\'price\',this.value)">'
        + '<button class="si-del" onclick="removeItem(\''+it.id+'\')" aria-label="remove">🗑</button>'
      + '</div>'
      + '<div class="sp-unit"><span class="sp-seg"><button class="'+(it.priceMode!=='unit'?'on':'')+'" onclick="setItemMode(\''+it.id+'\',\'total\')">'+t('split.modeTotal')+'</button><button class="'+(it.priceMode==='unit'?'on':'')+'" onclick="setItemMode(\''+it.id+'\',\'unit\')">'+t('split.modeEach')+'</button></span> '+fmtMoney(unit)+' '+t('split.unit')+' = '+fmtMoney(total)+' · '+t('split.assigned')+' <span class="sp-assigned'+(over?' over':'')+'">'+fmtUnit(assigned)+'/'+fmtUnit(it.qty)+'</span></div>'
      + '<div class="sp-assign">'+ppl+'</div>'
      + '<div class="sp-assign-meta"><div class="sp-shortcuts"><button class="sp-mini" onclick="splitEqual(\''+it.id+'\')">'+t('split.divideEqual')+'</button><button class="sp-mini" onclick="allMine(\''+it.id+'\')">'+t('split.allMine')+'</button></div></div>'
      + '</div>';
  }).join('');
}
function computeSplit(){
  const svc = document.getElementById('spSvc').checked;
  const pct = svc ? (parseFloat(document.getElementById('spSvcPct').value) || 0) : 0;
  return FinMath.computeSplitTotals(splitState, svc, pct);
}
function renderSplitTotals(){
  if (!splitState) return;
  const r = computeSplit();
  document.getElementById('spTotals').innerHTML = splitState.people.map(function(p){
    return '<div class="sp-total-row'+(p.isMe?' me':'')+'"><span>'+esc(p.name)+(p.isMe?' ★':'')+'</span><span>'+fmtMoney(r.totals[p.id]||0)+'</span></div>';
  }).join('') + '<div class="sp-total-row grand"><span>'+t('split.grand')+'</span><span>'+fmtMoney(r.grand)+'</span></div>';
  const warn = document.getElementById('spWarn');
  if (r.anyUnassigned) { warn.style.display = 'block'; warn.textContent = t('split.unassignedWarn'); }
  else warn.style.display = 'none';
}
function copySplitSummary(){
  const r = computeSplit();
  const title = (document.getElementById('spTitle').value || '').trim();
  const lines = [];
  if (title) lines.push('💸 ' + title);
  splitState.people.forEach(function(p){ lines.push((p.isMe?'★ ':'') + p.name + ': ' + fmtMoney(r.totals[p.id]||0)); });
  lines.push('—'); lines.push(t('split.grand') + ': ' + fmtMoney(r.grand));
  if (r.pct) lines.push(t('split.service') + ' ' + r.pct + '%');
  const text = lines.join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function(){ showToast(t('split.copied')); }, function(){ splFallbackCopy(text); });
  else splFallbackCopy(text);
}
function splFallbackCopy(text){ const ta = document.createElement('textarea'); ta.value = text; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); showToast(t('split.copied')); } catch(e){} document.body.removeChild(ta); }
function saveSplit(){
  if (!splitState) return;
  const title = (document.getElementById('spTitle').value || '').trim() || t('split.untitled');
  const r = computeSplit();
  const splitId = splUid(), created = Date.now();
  const rows = [];
  splitState.people.forEach(function(p){
    const amt = Math.round((r.totals[p.id]||0) * 100) / 100;
    if (amt <= 0) return;
    rows.push({ id:splUid(), splitId:splitId, created:created, title:title, person:p.name, amount:amt, paid:false, paidDate:0, mine: !!p.isMe });
  });
  if (!rows.some(function(d){ return !d.mine; })) { setFormError('splitErr', t('split.errNoDebt')); return; }
  if (!DATA.debts) DATA.debts = [];
  rows.forEach(d => DATA.debts.push(d));
  closeOverlay('splitOverlay'); renderDebts(); showToast(t('split.saved'));
  jbRun('addSplit', rows).catch(function(e){ showToast(t('err.prefix') + e.message, 'error'); reload(); });
}
function fmtDebtDate(ms){ if (!ms) return ''; try { return new Date(Number(ms)).toLocaleDateString(L(), { day:'2-digit', month:'short' }); } catch(e){ return ''; } }
function renderDebts(){
  const list = document.getElementById('debtsList'); if (!list) return;
  const debts = (DATA && DATA.debts) || [];
  const sumEl = document.getElementById('debtsSummary'), totEl = document.getElementById('debtsTotal');
  if (!debts.length) { list.innerHTML = '<div class="empty">'+t('debts.empty')+'</div>'; if (sumEl) sumEl.style.display = 'none'; return; }
  const groups = {}, order = [];
  debts.forEach(function(d){ if (!groups[d.splitId]) { groups[d.splitId] = { title:d.title, created:d.created, rows:[] }; order.push(d.splitId); } groups[d.splitId].rows.push(d); });
  order.sort(function(a,b){ return (groups[b].created||0) - (groups[a].created||0); });
  let outstanding = 0; debts.forEach(function(d){ if (!d.paid && !d.mine) outstanding += Number(d.amount) || 0; });
  if (sumEl) { sumEl.style.display = outstanding > 0 ? 'flex' : 'none'; if (totEl) totEl.textContent = brl(outstanding); }
  list.innerHTML = order.map(function(sid){
    const g = groups[sid];
    const owed = g.rows.filter(function(r){ return !r.mine; });
    const mine = g.rows.filter(function(r){ return r.mine; });
    const allPaid = owed.length && owed.every(function(r){ return r.paid; });
    const owedHtml = owed.map(function(d){
      return '<div class="debt-row'+(d.paid?' paid':'')+'">'
        + '<div class="dr-left"><span class="dr-name">'+esc(d.person)+'</span><span class="dr-amt">'+brl(d.amount)+'</span></div>'
        + '<button class="dr-pay'+(d.paid?' paid':'')+'" onclick="toggleDebt(\''+d.id+'\')">'+(d.paid?t('debts.paid'):t('debts.markPaid'))+'</button>'
        + '</div>';
    }).join('');
    const mineHtml = mine.map(function(d){
      return '<div class="debt-row mine">'
        + '<div class="dr-left"><span class="dr-name">'+esc(d.person)+'</span><span class="dr-amt">'+brl(d.amount)+'</span></div>'
        + '<span class="dr-share">'+t('debts.yourShare')+'</span>'
        + '</div>';
    }).join('');
    return '<div class="debt-outing'+(allPaid?' done':'')+'">'
      + '<div class="do-head"><div><span class="do-title">'+esc(g.title)+'</span><span class="do-date">'+fmtDebtDate(g.created)+'</span></div><button class="do-del" onclick="deleteOuting(\''+sid+'\')" title="'+escAttr(t('debts.deleteOuting'))+'">🗑</button></div>'
      + owedHtml + mineHtml
      + '</div>';
  }).join('');
}
function toggleDebt(id){
  const d = (DATA.debts||[]).find(function(x){ return x.id === id; }); if (!d) return;
  const np = !d.paid; d.paid = np; d.paidDate = np ? Date.now() : 0;
  renderDebts();
  jbRun('setDebtPaid', id, np, d.paidDate).catch(function(e){ showToast(t('err.prefix') + e.message, 'error'); reload(); });
}
function deleteOuting(sid){
  showConfirm(t('debts.delTitle'), t('debts.delMsg'), function(){
    DATA.debts = (DATA.debts||[]).filter(function(d){ return d.splitId !== sid; });
    renderDebts();
    jbRun('deleteSplit', sid).catch(function(e){ showToast(t('err.prefix') + e.message, 'error'); reload(); });
  });
}

function esc(s) { return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function escAttr(s) { return String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;'); }
// Inline form errors — shown below the form, cleared on the next submit attempt.
function setFormError(errId, msg) { const el=document.getElementById(errId); if(!el) return; el.textContent=msg||''; el.classList.toggle('show', !!msg); }
// Styled confirm modal replacing native confirm(). Runs onYes() when confirmed.
var nudgeCb=null;
function showNudge(title, msg, yesLabel, onYes){
  document.getElementById('nudgeTitle').textContent=title;
  document.getElementById('nudgeMsg').innerHTML=msg;
  var y=document.getElementById('nudgeYes'); y.textContent=yesLabel||'Confirmar';
  nudgeCb=onYes;
  y.onclick=function(){ closeNudge(); if(nudgeCb) nudgeCb(); };
  document.getElementById('nudgeCard').classList.add('show');
}
function closeNudge(){ document.getElementById('nudgeCard').classList.remove('show'); nudgeCb=null; }
function promptApplySalary(amt){
  wizSalaryAmt=amt;
  var y=now.getFullYear(), sel=document.getElementById('salaryWizMonth'), opts='';
  for(var mo=0;mo<12;mo++){ var ym=ymStr(y,mo); var lbl=new Date(y,mo,1).toLocaleString(L(),{month:'long',year:'numeric'}); opts+='<option value="'+ym+'"'+(mo===now.getMonth()?' selected':'')+'>'+lbl+'</option>'; }
  sel.innerHTML=opts;
  document.getElementById('salaryWizMsg').innerHTML='Você definiu um salário de <strong>'+brl(amt)+'</strong>. Aplicar como receita recorrente em todo mês a partir do escolhido?';
  document.getElementById('salaryCard').classList.add('show');
}
function closeSalaryWiz(){ document.getElementById('salaryCard').classList.remove('show'); if(!tourIsDone()) setTimeout(startTour,300); }
function applyWizSalary(){
  var ym=document.getElementById('salaryWizMonth').value;
  if(!DATA.settings)DATA.settings={};
  DATA.settings.salary_amount=wizSalaryAmt; DATA.settings.salary_start='m'+ym; DATA.settings.salary_end='';
  jbRun('saveProfile', {salary_amount:wizSalaryAmt, salary_start:'m'+ym, salary_end:''}).catch(function(e){showToast(t('err.prefix')+e.message,'error');});
  document.getElementById('salaryCard').classList.remove('show');
  renderAll(); showToast('Salário aplicado ✓');
  if(!tourIsDone()) setTimeout(startTour,300);
}
function showConfirm(title, msg, onYes) { JB.confirm(title, msg, onYes, { yes: t('action.confirm'), no: t('action.cancel'), danger: true }); }
JB.applySkin('finance');
