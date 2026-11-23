(() => {
    window.switchModuleTab = tabId => {
        document.querySelectorAll('.module-section').forEach(section => section.classList.toggle('active', section.id === tabId));
        document.querySelectorAll('.module-tab-btn').forEach(button => button.classList.toggle('active', button.dataset.moduleTab === tabId));
    };
    document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('.module-tab-btn[data-module-tab]').forEach(button => button.addEventListener('click', () => window.switchModuleTab(button.dataset.moduleTab))));
})();
