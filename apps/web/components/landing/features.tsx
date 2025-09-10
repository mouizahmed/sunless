import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Shield, Search, Users } from "lucide-react";

export default function Features() {
  return (
    <section id="features" className="px-6 py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
          The complete platform for 
          <br />
          AI-powered transcription
        </h2>
        <p className="text-center text-gray-600 mb-16 max-w-3xl mx-auto">
          WriteItOut is designed for building accurate transcripts that solve your 
          team&apos;s communication needs while improving productivity and collaboration.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Card 1: AI-Powered Accuracy */}
          <Card className="hover:shadow-xl transition-all duration-300 bg-white border-gray-200 overflow-hidden">
            <CardContent className="p-8">
              {/* Visual mockup area */}
              <div className="mb-8 h-48 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl flex items-center justify-center relative overflow-hidden">
                <div className="absolute top-4 left-4 flex gap-2">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <div className="w-4 h-4 bg-gray-300 rounded"></div>
                  </div>
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <Search className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                  </div>
                </div>
                
                <div className="absolute bottom-4 right-4">
                  <Button className="bg-black text-white rounded-full px-4 py-2 text-sm">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Ask AI
                  </Button>
                </div>
                
                <div className="text-center">
                  <div className="w-4 h-4 bg-green-500 rounded-full mx-auto mb-2"></div>
                  <div className="text-xs text-gray-500">AI-powered insights</div>
                </div>
              </div>

              <CardTitle className="text-xl mb-3">AI-powered for accuracy</CardTitle>
              <CardDescription className="text-gray-600 leading-relaxed">
                Advanced AI models with reasoning capabilities 
                for highly accurate transcripts and intelligent responses to complex queries.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Card 2: Real-time Collaboration */}
          <Card className="hover:shadow-xl transition-all duration-300 bg-white border-gray-200 overflow-hidden">
            <CardContent className="p-8">
              {/* Visual mockup area */}
              <div className="mb-8 h-48 bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl flex items-center justify-center relative overflow-hidden">
                <div className="absolute top-4 left-4">
                  <div className="flex items-center gap-2 bg-white rounded-full px-3 py-2 shadow-sm">
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white"></div>
                      <div className="w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
                      <div className="w-6 h-6 bg-purple-500 rounded-full border-2 border-white"></div>
                    </div>
                    <span className="text-xs text-gray-600">3 active</span>
                  </div>
                </div>
                
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="text-xs text-gray-500">Live collaboration</div>
                    </div>
                    <div className="flex gap-1">
                      <div className="h-2 bg-gray-200 rounded flex-1"></div>
                      <div className="h-2 bg-gray-200 rounded flex-1"></div>
                      <div className="h-2 bg-gray-200 rounded flex-1"></div>
                    </div>
                  </div>
                </div>
                
                <div className="text-center">
                  <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-xs text-gray-500">Real-time sync</div>
                </div>
              </div>

              <CardTitle className="text-xl mb-3">Designed for collaboration</CardTitle>
              <CardDescription className="text-gray-600 leading-relaxed">
                Create, manage, and share transcripts easily with your team, 
                even without technical skills. Perfect for meetings and interviews.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Card 3: Enterprise Security */}
          <Card className="hover:shadow-xl transition-all duration-300 bg-white border-gray-200 overflow-hidden">
            <CardContent className="p-8">
              {/* Visual mockup area */}
              <div className="mb-8 h-48 bg-gradient-to-br from-purple-50 to-violet-100 rounded-2xl flex items-center justify-center relative overflow-hidden">
                <div className="absolute top-4 left-4">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <div className="w-4 h-4 bg-gray-300 rounded"></div>
                  </div>
                </div>
                
                <div className="absolute top-4 right-4">
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  </div>
                </div>
                
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex justify-center gap-2">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  </div>
                  <div className="text-center mt-2">
                    <div className="text-xs text-gray-500">Enterprise security</div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-black rounded-3xl flex items-center justify-center mx-auto mb-2">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              <CardTitle className="text-xl mb-3">Engineered for security</CardTitle>
              <CardDescription className="text-gray-600 leading-relaxed">
                Enjoy peace of mind with robust encryption 
                and strict compliance standards. Your sensitive data stays protected.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}