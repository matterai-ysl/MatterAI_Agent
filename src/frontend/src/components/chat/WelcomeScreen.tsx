/**
 * 欢迎界面组件
 * 现代化的ChatGPT风格欢迎界面
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Bot, 
  MapPin, 
  Cloud, 
  Star, 
  Compass,
  MessageCircle,
  Sparkles
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';

/**
 * 示例问题卡片
 */
function ExampleCard({ 
  icon: Icon, 
  title, 
  description, 
  onClick 
}: {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <motion.div
      whileHover={{ 
        scale: 1.02, 
        y: -4,
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "p-6 bg-card border border-border rounded-xl cursor-pointer",
        "transition-all duration-200 group",
        "hover:border-primary/30 hover:bg-card/80"
      )}
    >
      <div className="flex items-start gap-4">
        <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1 space-y-2">
          <h3 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * 欢迎界面组件
 */
export function WelcomeScreen({ 
  onExampleClick 
}: { 
  onExampleClick: (message: string) => void;
}) {
  const { t } = useTranslation();
  
  const examples = [
    {
      icon: MapPin,
      title: t('matterai.welcome.examples.lithiumBattery.title'),
      description: t('matterai.welcome.examples.lithiumBattery.description'),
      message: t('matterai.welcome.examples.lithiumBattery.description')
    },
    {
      icon: Cloud,
      title: t('matterai.welcome.examples.alloyAnalysis.title'),
      description: t('matterai.welcome.examples.alloyAnalysis.description'),
      message: t('matterai.welcome.examples.alloyAnalysis.description')
    },
    {
      icon: Star,
      title: t('matterai.welcome.examples.ceramicOptimization.title'),
      description: t('matterai.welcome.examples.ceramicOptimization.description'),
      message: t('matterai.welcome.examples.ceramicOptimization.description')
    },
    {
      icon: Compass,
      title: t('matterai.welcome.examples.dataCollection.title'),
      description: t('matterai.welcome.examples.dataCollection.description'),
      message: t('matterai.welcome.examples.dataCollection.description')
    },
    {
      icon: MessageCircle,
      title: t('matterai.welcome.examples.characterization.title'),
      description: t('matterai.welcome.examples.characterization.description'),
      message: t('matterai.welcome.examples.characterization.description')
    },
    {
      icon: Sparkles,
      title: t('matterai.welcome.examples.composition.title'),
      description: t('matterai.welcome.examples.composition.description'),
      message: t('matterai.welcome.examples.composition.description')
    }
  ];

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* 主标题区域 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          {/* Logo 图标 */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="relative mx-auto w-20 h-20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80 rounded-2xl rotate-3 opacity-20" />
            <div className="relative bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center w-full h-full shadow-lg">
              <Bot className="h-10 w-10 text-white" />
            </div>
          </motion.div>

          {/* 标题 */}
          <div className="space-y-3">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent"
            >
              {t('matterai.welcome.title')}
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              {t('matterai.welcome.description')}
            </motion.p>
          </div>
        </motion.div>

        {/* 示例问题 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="space-y-6"
        >
          <h2 className="text-xl font-semibold text-foreground">
            {t('matterai.welcome.exampleTitle')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {examples.map((example, index) => (
              <motion.div
                key={example.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
              >
                <ExampleCard
                  icon={example.icon}
                  title={example.title}
                  description={example.description}
                  onClick={() => onExampleClick(example.message)}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* 底部提示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="pt-8"
        >
          <p className="text-sm text-muted-foreground">
            {t('chat.dragOrClick')}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
