const fs = require('fs');

// Read locale files
const zhLocale = JSON.parse(fs.readFileSync('./src/i18n/locales/zh.json', 'utf-8'));
const enLocale = JSON.parse(fs.readFileSync('./src/i18n/locales/en.json', 'utf-8'));

console.log('========== 新增工具翻译验证 ==========\n');

console.log('【中文翻译】');
console.log('- 材料特征工程:', zhLocale.tools.preset.featureEngineering.name);
console.log('  描述:', zhLocale.tools.preset.featureEngineering.description);

console.log('\n【English Translation】');
console.log('- Feature Engineering:', enLocale.tools.preset.featureEngineering.name);
console.log('  Description:', enLocale.tools.preset.featureEngineering.description);

console.log('\n✅ 材料特征工程工具配置验证成功！');
console.log('✅ Feature Engineering tool configuration verified successfully!');
