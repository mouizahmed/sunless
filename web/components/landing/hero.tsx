import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Search, MessageSquare, Clock, Users } from "lucide-react";

export default function Hero() {
  return (
    <section className="px-6 pt-40 text-center bg-white">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
          Transform any video into perfect text
        </h1>
        <p className="text-base text-gray-600 mb-6 max-w-2xl mx-auto">
          Upload files or paste any video link from the internet. Get accurate transcriptions, subtitles, and translations from YouTube, Vimeo, or any video URL.
          Faster and more affordable than the competition.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button size="lg" className="bg-black hover:bg-gray-800 text-white font-semibold px-6 py-3 rounded-full transition-colors">
            SIGN UP
          </Button>
          <Button variant="outline" size="lg" className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-full">
            CONTACT SALES
          </Button>
        </div>

        {/* Feature Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <Badge variant="outline" className="px-4 py-2 text-sm">
            <Clock className="w-4 h-4 mr-2" />
            TIMESTAMP NAVIGATION
          </Badge>
          <Badge variant="outline" className="px-4 py-2 text-sm">
            <MessageSquare className="w-4 h-4 mr-2" />
            AI CHAT
          </Badge>
          <Badge variant="outline" className="px-4 py-2 text-sm">
            <Users className="w-4 h-4 mr-2" />
            SPEAKER IDENTIFICATION
          </Badge>
          <Badge variant="outline" className="px-4 py-2 text-sm">
            <Search className="w-4 h-4 mr-2" />
            SMART SEARCH
          </Badge>
          <Badge variant="outline" className="px-4 py-2 text-sm">
            <Download className="w-4 h-4 mr-2" />
            EXPORT OPTIONS
          </Badge>
        </div>

        {/* Demo Area */}
        <div className="max-w-6xl mx-auto bg-white border border-gray-200 rounded-2xl p-6 mb-8">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Transcript Section */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Q3 Planning Meeting</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <Clock className="w-4 h-4" />
                    <span>45:32 duration</span>
                    <span className="mx-2">•</span>
                    <span>3 participants</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                      S
                    </div>
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                      M
                    </div>
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                      J
                    </div>
                  </div>
                  <div className="flex -space-x-1 ml-2">
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center border-2 border-white">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center border-2 border-white">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center border-2 border-white">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 max-h-80 overflow-y-auto">
                <div className="space-y-3 text-sm text-left">
                  <div className="flex gap-3">
                    <span className="text-blue-600 font-medium min-w-16">Sarah</span>
                    <div>
                      <span className="text-gray-400 text-xs cursor-pointer hover:text-blue-600" title="Jump to 02:15">[02:15]</span>
                      <span className="ml-2">Good morning everyone. Let&apos;s start with our 
                        <span className="bg-yellow-200 px-1 rounded cursor-pointer hover:bg-yellow-300" title="Jump to 02:18">[02:18] budget</span> 
                        review for Q3. We have some important decisions to make today.</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <span className="text-green-600 font-medium min-w-16">Mike</span>
                    <div>
                      <span className="text-gray-400 text-xs cursor-pointer hover:text-blue-600" title="Jump to 02:28">[02:28]</span>
                      <span className="ml-2">Thanks Sarah. I&apos;ve prepared the 
                        <span className="bg-yellow-200 px-1 rounded cursor-pointer hover:bg-yellow-300" title="Jump to 02:32">[02:32] financial projections</span>
                        for the next quarter. We&apos;re looking at a 15% increase in our marketing spend.</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <span className="text-purple-600 font-medium min-w-16">John</span>
                    <div>
                      <span className="text-gray-400 text-xs cursor-pointer hover:text-blue-600" title="Jump to 02:45">[02:45]</span>
                      <span className="ml-2">That sounds reasonable. What about the 
                        <span className="bg-yellow-200 px-1 rounded cursor-pointer hover:bg-yellow-300" title="Jump to 02:48">[02:48] timeline</span>
                        for the product launch? Are we still on track for September?</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <span className="text-blue-600 font-medium min-w-16">Sarah</span>
                    <div>
                      <span className="text-gray-400 text-xs cursor-pointer hover:text-blue-600" title="Jump to 03:02">[03:02]</span>
                      <span className="ml-2">Yes, we&apos;re on schedule. The development team confirmed the 
                        <span className="bg-yellow-200 px-1 rounded cursor-pointer hover:bg-yellow-300" title="Jump to 03:08">[03:08] action items</span>
                        from last week are complete. We should be ready for beta testing next month.</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <span className="text-green-600 font-medium min-w-16">Mike</span>
                    <div>
                      <span className="text-gray-400 text-xs cursor-pointer hover:text-blue-600" title="Jump to 03:25">[03:25]</span>
                      <span className="ml-2">Perfect. Let&apos;s also discuss the 
                        <span className="bg-yellow-200 px-1 rounded cursor-pointer hover:bg-yellow-300" title="Jump to 03:28">[03:28] resource allocation</span>
                        for Q4. We might need additional developers for the mobile app.</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder="Search transcript... (try 'budget', 'timeline', 'action items')"
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>
            
            {/* AI Chat Section */}
            <div className="md:col-span-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                AI Assistant
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-4 h-80 flex flex-col">
                <div className="flex-1 space-y-4 text-sm overflow-y-auto">
                  <div className="bg-blue-100 rounded-lg p-3">
                    <p className="text-gray-700 mb-2"><strong>You:</strong> What were the main action items discussed?</p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-gray-700 mb-2"><strong>AI:</strong> Based on the transcript, the main action items were:</p>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      <li>Complete Q3 budget review (mentioned at 02:18)</li>
                      <li>Finalize marketing spend increase (02:32)</li>
                      <li>Prepare for September product launch (02:48)</li>
                      <li>Start beta testing next month (03:08)</li>
                    </ul>
                  </div>
                  
                  <div className="bg-blue-100 rounded-lg p-3">
                    <p className="text-gray-700"><strong>You:</strong> Who mentioned the timeline concerns?</p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-gray-700"><strong>AI:</strong> John asked about the timeline at 02:45, specifically about the September product launch schedule.</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Ask about the meeting..."
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white px-3">
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">START TRANSCRIBING WITH AI-POWERED INSIGHTS</p>
          <Button size="lg" className="bg-black hover:bg-gray-800 text-white font-semibold px-8 py-3 rounded-full">
            SIGN UP
          </Button>
        </div>
      </div>
    </section>
  );
}